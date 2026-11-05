import { createContext, useContext } from "react";

export const WorkspaceActivity = createContext(true);
/** Hidden, previously visited panels retain forms without background queries. */
export function useWorkspaceActive() {
  return useContext(WorkspaceActivity);
}
