import { JsonAdaptor, DataManager, Query } from '@syncfusion/ej2-data';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';

/**
 * Custom Syncfusion Data Adaptor för Supabase
 *
 * Denna adaptor gör att Syncfusion Schedule kan arbeta direkt med Supabase
 * för alla CRUD-operationer, istället för att kämpa mot React state.
 */
export class SupabaseAdaptor extends JsonAdaptor {
  private userId: string;
  private tableName: string = 'tasks';

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  /**
   * Hämta data från Supabase
   * Denna metod körs av DataManager för att ladda initial data och vid refresh
   */
  async processQuery(_dataManager: DataManager, _query?: Query): Promise<any> {
    try {
      console.log('🔵 [SupabaseAdaptor] processQuery called');

      // Hämta tasks från Supabase
      const { data: tasks, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', this.userId);

      if (error) throw error;

      console.log('🔵 [SupabaseAdaptor] Fetched', tasks?.length || 0, 'tasks');

      // Konvertera till Schedule event format
      const events = (tasks || [])
        .filter(task => task.scheduled_start && task.status !== 'done')
        .map(task => this.taskToEvent(task));

      console.log('🔵 [SupabaseAdaptor] Converted to', events.length, 'events');

      // Returnera i Syncfusion-format
      return {
        result: events,
        count: events.length
      };
    } catch (error) {
      console.error('❌ [SupabaseAdaptor] processQuery error:', error);
      return { result: [], count: 0 };
    }
  }

  /**
   * Lägg till ny event (task scheduling)
   */
  async insert(_dm: DataManager, data: any, _tableName?: string): Promise<any> {
    try {
      console.log('🟢 [SupabaseAdaptor] insert called with:', data);

      // Om det är en ny task som schemaläggs via drag-and-drop
      if (data.TaskId) {
        // Uppdatera befintlig task med scheduled_start
        const { data: result, error } = await supabase
          .from(this.tableName)
          .update({ scheduled_start: data.StartTime.toISOString() })
          .eq('id', data.TaskId)
          .eq('user_id', this.userId)
          .select()
          .single();

        if (error) throw error;

        console.log('✅ [SupabaseAdaptor] Task scheduled:', result.id);
        return this.taskToEvent(result);
      }

      // Annars: Skapa ny fokustid/event
      // (Detta hanteras senare om vi vill skapa nya events direkt i kalendern)
      return data;
    } catch (error) {
      console.error('❌ [SupabaseAdaptor] insert error:', error);
      throw error;
    }
  }

  /**
   * Uppdatera event (flytta tid, resize, etc)
   */
  async update(_dm: DataManager, _keyField: string, data: any, _tableName?: string): Promise<any> {
    try {
      console.log('🟡 [SupabaseAdaptor] update called with:', data);

      if (data.TaskId) {
        // Uppdatera task scheduled_start när man drar i kalendern
        const { data: result, error } = await supabase
          .from(this.tableName)
          .update({
            scheduled_start: data.StartTime.toISOString()
          })
          .eq('id', data.TaskId)
          .eq('user_id', this.userId)
          .select()
          .single();

        if (error) throw error;

        console.log('✅ [SupabaseAdaptor] Task updated:', result.id);
        return this.taskToEvent(result);
      }

      return data;
    } catch (error) {
      console.error('❌ [SupabaseAdaptor] update error:', error);
      throw error;
    }
  }

  /**
   * Ta bort event (remove from schedule)
   */
  async remove(_dm: DataManager, keyField: string, value: any, _tableName?: string): Promise<any> {
    try {
      console.log('🔴 [SupabaseAdaptor] remove called with:', value);

      // Hitta vilket event som ska tas bort
      const eventId = typeof value === 'object' ? value[keyField] : value;

      // Om det är en task-event, ta bara bort scheduled_start (inte hela tasken!)
      const taskId = eventId.toString().replace('task-', '');

      const { error } = await supabase
        .from(this.tableName)
        .update({ scheduled_start: null })
        .eq('id', taskId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [SupabaseAdaptor] Task removed from schedule:', taskId);
      return {};
    } catch (error) {
      console.error('❌ [SupabaseAdaptor] remove error:', error);
      throw error;
    }
  }

  /**
   * Konvertera Task till Calendar Event format
   */
  private taskToEvent(task: Task): any {
    const scheduledStart = new Date(task.scheduled_start!);
    const durationMinutes = task.estimated_duration || 30;

    return {
      Id: `task-${task.id}`,
      Subject: `📌 ${task.title}`,
      StartTime: scheduledStart,
      EndTime: new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000),
      IsReadonly: false,
      CategoryColor: '#dc2626',
      EventType: 'task',
      TaskId: task.id,
      // Behåll original task data för referens
      _task: task
    };
  }
}
