export const permissionKeys = [
  "manageTeam",
  "editSchedule",
  "editEvent",
  "manageFiles",
  "manageLocations",
  "invite",
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export type MemberPermissions = Record<PermissionKey, boolean>;

export const permissionLabels: Record<PermissionKey, { title: string; hint: string }> = {
  manageTeam: { title: "Команда", hint: "Добавлять и удалять участников и свободные роли" },
  editSchedule: { title: "Расписание", hint: "Блоки, задачи, время и переходы" },
  editEvent: { title: "Событие", hint: "Название, дата, локация, описание и обложка" },
  manageFiles: { title: "Файлы", hint: "PDF программы и материалы" },
  manageLocations: { title: "Локации", hint: "Заготовленные локации события" },
  invite: { title: "Приглашения", hint: "Шаринг кода и ссылки" },
};

export const noPermissions = (): MemberPermissions => ({
  manageTeam: false,
  editSchedule: false,
  editEvent: false,
  manageFiles: false,
  manageLocations: false,
  invite: false,
});

export const allPermissions = (): MemberPermissions => ({
  manageTeam: true,
  editSchedule: true,
  editEvent: true,
  manageFiles: true,
  manageLocations: true,
  invite: true,
});

export type Membership = {
  isOwner: boolean;
  permissions: MemberPermissions;
};

export function can(membership: Membership | null | undefined, key: PermissionKey) {
  if (!membership) return false;
  if (membership.isOwner) return true;
  return membership.permissions[key] === true;
}
