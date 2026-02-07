import { Avatar, AvatarFallback, Badge } from "@repo/ui";
import type { ProjectMember } from "@/lib/actions/projects";

interface ProjectMembersSectionProps {
  members: ProjectMember[];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function ProjectMembersSection({ members }: ProjectMembersSectionProps): React.ReactElement {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members assigned to this project.</p>;
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(member.user.name, member.user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{member.user.name ?? member.user.email}</p>
            {member.user.name && (
              <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
            )}
          </div>
          {member.role && (
            <Badge variant="secondary" className="text-xs">
              {member.role}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
