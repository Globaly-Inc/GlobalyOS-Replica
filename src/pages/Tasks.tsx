import { CheckSquare } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

const Tasks = () => {
  return (
    <ComingSoon
      icon={CheckSquare}
      title="Tasks"
      description="Project and task management for your team."
      features={[
        "Create and assign tasks",
        "Project boards and timelines",
        "Due dates and reminders",
        "Progress tracking and reporting",
      ]}
    />
  );
};

export default Tasks;
