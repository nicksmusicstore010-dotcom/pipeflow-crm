"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";

import { moveDeal } from "@/actions/deals";
import { DealCard } from "@/components/pipeline/deal-card";
import { DealFormDialog } from "@/components/pipeline/deal-form-dialog";
import { KanbanColumn } from "@/components/pipeline/kanban-column";
import { Button } from "@/components/ui/button";
import { NETWORK_ERROR, toastActionError } from "@/lib/action-feedback";
import { DEAL_STAGE_STYLES, DEAL_STAGES, isDealStage, type DealStage } from "@/lib/deal-stages";
import type { Deal, LeadOption } from "@/lib/deals";
import { cn } from "@/lib/utils";
import type { WorkspaceMember } from "@/lib/workspaces";

type Columns = Record<DealStage, Deal[]>;

function groupByStage(deals: Deal[]): Columns {
  const columns = Object.fromEntries(DEAL_STAGES.map((stage) => [stage, [] as Deal[]])) as Columns;
  for (const deal of deals) columns[deal.stage].push(deal);
  for (const stage of DEAL_STAGES) columns[stage].sort((a, b) => a.position - b.position);
  return columns;
}

/** Stage a droppable id belongs to: a column id is the stage itself, a card id is looked up. */
function containerOf(columns: Columns, id: UniqueIdentifier): DealStage | null {
  if (isDealStage(id)) return id;
  return DEAL_STAGES.find((stage) => columns[stage].some((deal) => deal.id === id)) ?? null;
}

function locate(columns: Columns, dealId: UniqueIdentifier) {
  const stage = containerOf(columns, dealId);
  return stage ? { stage, index: columns[stage].findIndex((deal) => deal.id === dealId) } : null;
}

/**
 * Kanban with drag-and-drop (mouse, touch and keyboard). Moves show immediately, are saved
 * with `moveDeal`, and are undone if the server refuses. Clicking a card opens it for editing.
 */
export function PipelineBoard({
  workspaceSlug,
  deals,
  members,
  leads,
  currentUserId,
  today,
}: {
  workspaceSlug: string;
  deals: Deal[];
  members: WorkspaceMember[];
  leads: LeadOption[];
  currentUserId: string;
  today: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(() => groupByStage(deals));
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [creatingIn, setCreatingIn] = useState<DealStage | null>(null);
  // Board before the current drag, to undo it if the server refuses.
  const beforeDrag = useRef<Columns | null>(null);
  const pendingMoves = useRef(0);
  const [settled, setSettled] = useState(0);

  // Adopt fresh server data, except mid-drag or while a move is still being saved
  // (the refresh would briefly put the card back where it was).
  useEffect(() => {
    if (activeId === null && pendingMoves.current === 0) setColumns(groupByStage(deals));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeId only matters when it clears, via `settled`
  }, [deals, settled]);

  const ownerNames = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const activeDeal = activeId ? DEAL_STAGES.flatMap((s) => columns[s]).find((d) => d.id === activeId) : undefined;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press and hold on touch screens, so a swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter is kept for opening the card.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    beforeDrag.current = columns;
    setActiveId(active.id);
  }

  // Crossing into another column moves the card there right away, so the list makes room.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setColumns((prev) => {
      const from = containerOf(prev, active.id);
      const to = containerOf(prev, over.id);
      if (!from || !to || from === to) return prev;

      const moving = prev[from].find((deal) => deal.id === active.id);
      if (!moving) return prev;
      const target = prev[to];
      const overIndex = target.findIndex((deal) => deal.id === over.id);
      // Past the middle of the card under it (comparing centers) → goes after that card.
      const translated = active.rect.current.translated;
      const below = translated
        ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2
        : false;
      const index = overIndex < 0 ? target.length : overIndex + (below ? 1 : 0);

      return {
        ...prev,
        [from]: prev[from].filter((deal) => deal.id !== active.id),
        [to]: [...target.slice(0, index), { ...moving, stage: to }, ...target.slice(index)],
      };
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const before = beforeDrag.current;
    beforeDrag.current = null;
    setActiveId(null);
    setSettled((n) => n + 1);
    if (!before) return;

    let next = columns;
    const stage = containerOf(columns, active.id);
    if (over && stage && containerOf(columns, over.id) === stage) {
      const oldIndex = columns[stage].findIndex((deal) => deal.id === active.id);
      const overIndex = columns[stage].findIndex((deal) => deal.id === over.id);
      const newIndex = overIndex < 0 ? columns[stage].length - 1 : overIndex;
      if (oldIndex !== newIndex) next = { ...columns, [stage]: arrayMove(columns[stage], oldIndex, newIndex) };
    }
    if (!over) next = before; // dropped outside every column: nothing changes

    const from = locate(before, active.id);
    const to = locate(next, active.id);
    setColumns(next);
    if (!from || !to || (from.stage === to.stage && from.index === to.index)) return;

    pendingMoves.current += 1;
    void moveDeal(workspaceSlug, { dealId: String(active.id), stage: to.stage, index: to.index })
      .catch(() => NETWORK_ERROR)
      .then((result) => {
        pendingMoves.current -= 1;
        // On success the screen already matches the server; the refreshed props arrive on their own.
        if (!result.ok) {
          // Undo on screen, then reload the real board (someone may have changed it meanwhile).
          setColumns(before);
          toastActionError(result);
          router.refresh();
        }
      });
  }

  function handleDragCancel() {
    if (beforeDrag.current) setColumns(beforeDrag.current);
    beforeDrag.current = null;
    setActiveId(null);
    setSettled((n) => n + 1);
  }

  const titleOf = (id: UniqueIdentifier) =>
    DEAL_STAGES.flatMap((s) => columns[s]).find((d) => d.id === id)?.title ?? "Negócio";
  const placeOf = (id: UniqueIdentifier) => {
    const place = locate(columns, id);
    return place ? `${DEAL_STAGE_STYLES[place.stage].label}, posição ${place.index + 1}` : "";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${titleOf(active.id)} selecionado. ${placeOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} em ${placeOf(active.id)}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} solto em ${placeOf(active.id)}.` : `${titleOf(active.id)} solto fora do quadro.`,
    onDragCancel: ({ active }) => `Movimento cancelado. ${titleOf(active.id)} voltou ao lugar.`,
  };

  return (
    <>
      <DndContext
        id="pipeline-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Enter abre o negócio. Para mover, pressione espaço, use as setas para trocar de posição ou de etapa, espaço para soltar e Esc para cancelar.",
          },
        }}
      >
        {/* Negative margins let the board scroll edge to edge on small screens. */}
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-start gap-4">
            {DEAL_STAGES.map((stage) => (
              <BoardColumn
                key={stage}
                stage={stage}
                deals={columns[stage]}
                ownerNames={ownerNames}
                today={today}
                onOpen={setEditing}
                onAdd={() => setCreatingIn(stage)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeDeal && (
            <DealCard
              deal={activeDeal}
              ownerName={activeDeal.owner_id ? ownerNames.get(activeDeal.owner_id) : undefined}
              today={today}
              className="w-[17rem] rotate-2 cursor-grabbing shadow-lg"
            />
          )}
        </DragOverlay>
      </DndContext>

      <DealFormDialog
        workspaceSlug={workspaceSlug}
        members={members}
        leads={leads}
        currentUserId={currentUserId}
        deal={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <DealFormDialog
        workspaceSlug={workspaceSlug}
        members={members}
        leads={leads}
        currentUserId={currentUserId}
        defaults={{ stage: creatingIn ?? undefined }}
        open={creatingIn !== null}
        onOpenChange={(open) => !open && setCreatingIn(null)}
      />
    </>
  );
}

function BoardColumn({
  stage,
  deals,
  ownerNames,
  today,
  onOpen,
  onAdd,
}: {
  stage: DealStage;
  deals: Deal[];
  ownerNames: Map<string, string>;
  today: string;
  onOpen: (deal: Deal) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const totalCents = deals.reduce((sum, deal) => sum + deal.value_cents, 0);

  return (
    <KanbanColumn
      stage={stage}
      count={deals.length}
      totalCents={totalCents}
      listRef={setNodeRef}
      isOver={isOver}
      footer={
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onAdd}>
          <Plus />
          Adicionar
        </Button>
      }
    >
      {deals.length > 0 ? (
        <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDeal
              key={deal.id}
              deal={deal}
              ownerName={deal.owner_id ? ownerNames.get(deal.owner_id) : undefined}
              today={today}
              onOpen={onOpen}
            />
          ))}
        </SortableContext>
      ) : undefined}
    </KanbanColumn>
  );
}

function SortableDeal({
  deal,
  ownerName,
  today,
  onOpen,
}: {
  deal: Deal;
  ownerName?: string;
  today: string;
  onOpen: (deal: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="negócio arrastável"
      aria-label={deal.title}
      onClick={() => onOpen(deal)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(deal);
        else listeners?.onKeyDown?.(event);
      }}
      className={cn(
        "cursor-grab rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
    >
      <DealCard deal={deal} ownerName={ownerName} today={today} className="hover:border-primary/50" />
    </div>
  );
}
