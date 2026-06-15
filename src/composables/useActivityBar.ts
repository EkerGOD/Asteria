import { ref } from "vue";

export interface Activity {
  id: string;
  label: string;
  icon: string;
}

type ActivityId = "files" | "search";

const ACTIVITIES: Activity[] = [
  { id: "files", label: "Explorer", icon: "codicon-files" },
  { id: "search", label: "Search", icon: "codicon-search" },
];

const activeActivity = ref<ActivityId>("files");

export function useActivityBar() {
  function setActivity(id: string) {
    if (ACTIVITIES.some((a) => a.id === id)) {
      activeActivity.value = id as ActivityId;
    }
  }

  return {
    activeActivity,
    setActivity,
    activities: ACTIVITIES,
  };
}
