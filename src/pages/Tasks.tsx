import { CheckSquare } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ComingSoon } from "@/components/ComingSoon";

const Tasks = () => {
  return (
    <Layout>
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
    </Layout>
  );
};

export default Tasks;
