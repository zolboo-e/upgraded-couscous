export interface TaskContextItem {
  title: string;
  status: string;
  priority: string;
}

export interface TaskSessionContext {
  task: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: Date | null;
  };
  project: {
    name: string;
    description: string | null;
  };
  assignees: string[];
  siblingTasks: TaskContextItem[];
}

export interface ProjectMemberContext {
  name: string | null;
  email: string;
  role: string | null;
}

export interface ProjectSessionContext {
  project: {
    name: string;
    description: string | null;
  };
  members: ProjectMemberContext[];
  tasks: TaskContextItem[];
}

function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) {
    return "None";
  }
  return dueDate.toISOString().split("T")[0];
}

function formatAssignees(assignees: string[]): string {
  return assignees.length > 0 ? assignees.join(", ") : "Unassigned";
}

function formatTaskList(tasks: TaskContextItem[]): string {
  if (tasks.length === 0) {
    return "No tasks yet.";
  }
  return tasks.map((t) => `- [${t.status}] ${t.title} (${t.priority})`).join("\n");
}

function formatMemberList(members: ProjectMemberContext[]): string {
  if (members.length === 0) {
    return "No members yet.";
  }
  return members.map((m) => `- ${m.name ?? m.email} (${m.role ?? "member"})`).join("\n");
}

export function buildTaskSessionPrompt(context: TaskSessionContext): string {
  const { task, project, assignees, siblingTasks } = context;

  const lines = [
    `You are assisting with a task in the "${project.name}" project.`,
    "",
    "## Current Task",
    `- **Title**: ${task.title}`,
    `- **Status**: ${task.status}`,
    `- **Priority**: ${task.priority}`,
    `- **Due**: ${formatDueDate(task.dueDate)}`,
    `- **Assignees**: ${formatAssignees(assignees)}`,
  ];

  if (task.description) {
    lines.push("", "### Description", task.description);
  }

  if (project.description) {
    lines.push("", "## Project Context", project.description);
  }

  if (siblingTasks.length > 0) {
    lines.push("", "## Other Tasks in Project", formatTaskList(siblingTasks));
  }

  lines.push(
    "",
    "## Task Management",
    "You have an `update_task` tool that can update this task's title and description.",
    "Use it when:",
    "- The user clarifies what this task is actually about and the current title/description is vague or inaccurate",
    "- The task scope changes meaningfully during the conversation",
    '- The title is generic (e.g. "New task") and a better name emerges',
    "",
    "**IMPORTANT**: Before calling `update_task`, you MUST use `AskUserQuestion` to propose the changes and get explicit user confirmation. Never update without asking first.",
    "Do NOT update for trivial rephrasing or cosmetic changes.",
    "",
    "Help the user complete this task. Provide relevant guidance, code, or answers.",
  );

  return lines.join("\n");
}

export function buildProjectSessionPrompt(context: ProjectSessionContext): string {
  const { project, members, tasks } = context;

  const lines = [`You are assisting with the project "${project.name}".`];

  if (project.description) {
    lines.push("", "## Description", project.description);
  }

  if (members.length > 0) {
    lines.push("", "## Team", formatMemberList(members));
  }

  lines.push("", "## Tasks", formatTaskList(tasks));

  lines.push("", "Help the user with any questions or tasks related to this project.");

  return lines.join("\n");
}
