export type User = {
  id: number;
  username: string;
  email: string;
  avatar_color: string;
};

export type Household = {
  id: number;
  name: string;
  invite_code: string;
};

export type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type Task = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  recurrence: Recurrence;
  due_date: string | null;
  assigned_to: User | null;
  created_at: string;
};

export type Debt = {
  from_user: User;
  to_user: User;
  amount: number;
};

export type ShoppingItem = {
  id: number;
  name: string;
  quantity: string;
  completed: boolean;
  created_at: string;
  added_by: User;
};

export type ExpenseCategory =
  | 'rent' | 'electricity' | 'internet' | 'groceries' | 'household'
  | 'repair' | 'leisure' | 'deposit' | 'other';

export type SplitMethod = 'equal' | 'exact' | 'percent' | 'shares';

export type ExpenseParticipant = {
  user: User;
  amount: number;
};

export type Expense = {
  id: number;
  title: string;
  amount: number;
  paid_by: User;
  category: ExpenseCategory;
  split_method: SplitMethod;
  participants: ExpenseParticipant[];
  created_at: string;
};

export type AuthResponse = {
  token: string;
  user: User;
  wg?: Household | null;
};

export type DashboardResponse = {
  wg: Household;
  members: User[];
  open_tasks: number;
  shopping_count: number;
  my_tasks: Task[];
  my_debts: Debt[];
  owed_to_me: Debt[];
};

export type TasksResponse = {
  open_tasks: Task[];
  done_tasks: Task[];
  members: User[];
};

export type ShoppingResponse = {
  pending: ShoppingItem[];
  done: ShoppingItem[];
};

export type Settlement = {
  from_user: User;
  to_user: User;
  amount: number;
};

export type MemberBalance = {
  user: User;
  amount: number;
};

export type FinanceResponse = {
  expenses: Expense[];
  debts: Debt[];
  settlements: Settlement[];
  balances: MemberBalance[];
  my_balance: number;
  total: number;
  members: User[];
};

export type HouseholdInfoResponse = {
  wg: Household;
  members: User[];
};

export type CalendarEvent = {
  id: number;
  title: string;
  event_type: string;
  starts_at: string;
  notes: string;
  created_by: User;
  created_at: string;
};

export type Rule = {
  id: number;
  title: string;
  content: string;
  category: string;
  active: boolean;
  created_by: User;
  created_at: string;
};

export type PollOption = {
  id: number;
  text: string;
  votes: number;
};

export type Poll = {
  id: number;
  title: string;
  description: string;
  created_by: User;
  created_at: string;
  options: PollOption[];
};

export type MoodSummary = {
  count: number;
  wellbeing: number | null;
  fairness: number | null;
  cleanliness: number | null;
  communication: number | null;
  visible: boolean;
};

export type ConflictReport = {
  id: number;
  category: string;
  urgency: string;
  description: string;
  desired_solution: string;
  anonymous: boolean;
  status: string;
  reporter: User | null;
  created_at: string;
};

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  target: string;
  read: boolean;
  created_at: string;
};

export type TrustEvent = {
  id: number;
  event_type: string;
  points: number;
  explanation: string;
  disputed: boolean;
  created_at: string;
};

export type TrustProfile = {
  score: number | null;
  max_score: number;
  level: string;
  enough_data: boolean;
  verified_events: number;
  task_reliability: number;
  open_tasks: number;
  payment_reliability: number;
  events: TrustEvent[];
};

export type ReceiptOcrResult = {
  status: 'ocr_completed' | 'no_text_detected' | 'ocr_unavailable' | 'manual_review_required';
  needs_review: boolean;
  message: string;
  receipt: {
    merchant: string;
    date: string;
    total: number | null;
    raw_text: string;
    items: string[];
  };
};
