export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  manager?: string;
  joinDate: string;
  avatar?: string;
  phone?: string;
  city?: string;
  country?: string;
  superpowers?: string[];
  status?: 'invited' | 'active' | 'inactive';
  officeName?: string;
  officeEmployeeCount?: number;
}

export interface Kudos {
  id: string;
  employeeId: string;
  employeeName: string;
  givenBy: string;
  givenByAvatar?: string;
  comment: string;
  date: string;
  avatar?: string;
  otherRecipients?: string[];
}

export interface UpdateMention {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar?: string;
}

export interface Update {
  id: string;
  employeeId: string;
  employeeName: string;
  content: string;
  date: string;
  avatar?: string;
  imageUrl?: string;
  type: "win" | "announcement" | "achievement";
  mentions?: UpdateMention[];
}

export interface Achievement {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  date: string;
}
