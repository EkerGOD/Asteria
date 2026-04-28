export type SectionId = "chat" | "knowledge" | "projects" | "settings" | "diagnostics";

export type Section = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
};

export const sections: Section[] = [
  {
    id: "chat",
    label: "Chat",
    title: "Chat",
    description: "Conversation workspace with grounded answer sources."
  },
  {
    id: "knowledge",
    label: "Knowledge",
    title: "Knowledge",
    description: "Local knowledge units, tags, and project filters."
  },
  {
    id: "projects",
    label: "Projects",
    title: "Projects",
    description: "Work contexts for conversations and knowledge."
  },
  {
    id: "settings",
    label: "Settings",
    title: "Settings",
    description: "Local preferences and provider configuration surfaces."
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    title: "Diagnostics",
    description: "Local service, database, and provider status checks."
  }
];
