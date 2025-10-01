import { useState } from 'react';
import { Task, Quadrant } from '@/lib/types';
import { QuadrantCard } from './QuadrantCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { Button } from '@/components/ui/Button';
import { useTasks } from '@/hooks/useTasks';
import { getTaskQuadrant } from '@/lib/utils';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { CheckCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function EisenhowerMatrix() {
  const { tasks, createTask, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [targetQuadrant, setTargetQuadrant] = useState<Quadrant | undefined>(undefined);

  const tasksByQuadrant: Record<Quadrant, Task[]> = {
    Q1: tasks.filter((t) => getTaskQuadrant(t) === 'Q1' && t.status !== 'done'),
    Q2: tasks.filter((t) => getTaskQuadrant(t) === 'Q2' && t.status !== 'done'),
    Q3: tasks.filter((t) => getTaskQuadrant(t) === 'Q3' && t.status !== 'done'),
    Q4: tasks.filter((t) => getTaskQuadrant(t) === 'Q4' && t.status !== 'done'),
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTargetQuadrant(undefined);
    setIsFormOpen(true);
  };

  const handleAddTask = (quadrant: Quadrant) => {
    setSelectedTask(undefined);
    setTargetQuadrant(quadrant);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (input: any) => {
    if (targetQuadrant && !selectedTask) {
      const quadrantDefaults = {
        Q1: { importance: 8, urgency: 8 },
        Q2: { importance: 8, urgency: 3 },
        Q3: { importance: 3, urgency: 8 },
        Q4: { importance: 3, urgency: 3 },
      };

      const defaults = quadrantDefaults[targetQuadrant];
      await createTask({
        ...input,
        importance: input.importance ?? defaults.importance,
        urgency: input.urgency ?? defaults.urgency,
      });
    } else if (selectedTask) {
      await updateTask(selectedTask.id, input);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const targetQuadrant = over.id as Quadrant;
    const quadrantUpdates = {
      Q1: { importance: 8, urgency: 8 },
      Q2: { importance: 8, urgency: 3 },
      Q3: { importance: 3, urgency: 8 },
      Q4: { importance: 3, urgency: 3 },
    };

    const updates = quadrantUpdates[targetQuadrant];
    if (updates) {
      await updateTask(task.id, updates);
    }
  };

  const handleBulkCompleteQ4 = async () => {
    const q4Tasks = tasksByQuadrant.Q4;
    if (q4Tasks.length === 0) {
      toast.error('Inga tasks i Q4');
      return;
    }

    const confirmed = confirm(`Markera alla ${q4Tasks.length} tasks i Q4 som klara?`);
    if (!confirmed) return;

    try {
      await Promise.all(
        q4Tasks.map(task => updateTask(task.id, { status: 'done' }))
      );
      toast.success(`${q4Tasks.length} tasks markerade som klara!`);
    } catch (error) {
      console.error('Bulk complete error:', error);
      toast.error('Kunde inte markera alla tasks som klara');
    }
  };

  const handleDuplicate = async (task: Task) => {
    try {
      await createTask({
        title: `${task.title} (kopia)`,
        description: task.description || undefined,
        importance: task.importance,
        urgency: task.urgency,
        deadline: task.deadline || undefined,
        status: 'not_started',
      });
      toast.success('Task duplicerad!');
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Kunde inte duplicera task');
    }
  };

  return (
    <>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {tasksByQuadrant.Q4.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkCompleteQ4}
                className="text-gray-600 dark:text-gray-400"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Markera alla Q4 som klara ({tasksByQuadrant.Q4.length})
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          <QuadrantCard
            quadrant="Q1"
            tasks={tasksByQuadrant.Q1}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onDuplicate={handleDuplicate}
          />
          <QuadrantCard
            quadrant="Q2"
            tasks={tasksByQuadrant.Q2}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onDuplicate={handleDuplicate}
          />
          <QuadrantCard
            quadrant="Q3"
            tasks={tasksByQuadrant.Q3}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onDuplicate={handleDuplicate}
          />
          <QuadrantCard
            quadrant="Q4"
            tasks={tasksByQuadrant.Q4}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onDuplicate={handleDuplicate}
          />
          </div>
        </div>
      </DndContext>

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        task={selectedTask}
      />
    </>
  );
}
