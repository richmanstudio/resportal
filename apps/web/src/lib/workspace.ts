import { useOutletContext } from "react-router-dom";
import type { Workspace } from "./api";

export type WorkspaceContext = {
  workspace: Workspace;
  refreshWorkspace: () => Promise<void>;
};

export function useWorkspace() {
  return useOutletContext<WorkspaceContext>();
}
