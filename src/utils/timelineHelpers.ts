import { Task } from '../types';

export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const layoutTasks = (tasksList: Task[]): Array<Task & { column: number; totalColumns: number }> => {
  const sorted = [...tasksList].sort((a, b) => timeToMinutes(a.time || "00:00") - timeToMinutes(b.time || "00:00"));
  
  // Group tasks into overlapping groups (clusters) where contiguous tasks overlap
  // A task overlaps with another if their start times are within 60 minutes of each other
  const clusters: Task[][] = [];
  sorted.forEach(task => {
    if (clusters.length === 0) {
      clusters.push([task]);
    } else {
      const lastCluster = clusters[clusters.length - 1];
      const lastTask = lastCluster[lastCluster.length - 1];
      const currentStart = timeToMinutes(task.time || "00:00");
      const lastStart = timeToMinutes(lastTask.time || "00:00");
      
      // If the current task starts within 60 minutes of the last task, they belong to the same cluster
      if (currentStart - lastStart < 60) {
        lastCluster.push(task);
      } else {
        clusters.push([task]);
      }
    }
  });

  const result: Array<Task & { column: number; totalColumns: number }> = [];

  clusters.forEach(cluster => {
    // Within each cluster, assign columns.
    // We want to find the smallest column number for each task such that it doesn't overlap with another task in the same column
    const columns: Task[][] = [];
    cluster.forEach(task => {
      const taskStart = timeToMinutes(task.time || "00:00");
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        const lastEnd = timeToMinutes(lastInCol.time || "00:00") + 60; // 60 min default duration
        if (taskStart >= lastEnd) {
          columns[col].push(task);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([task]);
      }
    });

    cluster.forEach(task => {
      const colIndex = columns.findIndex(col => col.includes(task));
      result.push({ ...task, column: colIndex, totalColumns: columns.length });
    });
  });

  return result;
};
