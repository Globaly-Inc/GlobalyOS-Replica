import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRMCustomFieldsManager } from "@/components/crm/CRMCustomFieldsManager";
import { CRMTagsManager } from "@/components/crm/CRMTagsManager";

const SettingsCRM = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        subtitle="Manage custom fields and tags for your CRM"
      />
      <Card className="overflow-hidden">
        <Tabs defaultValue="contact-fields">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="contact-fields">Contact Fields</TabsTrigger>
            <TabsTrigger value="company-fields">Company Fields</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="contact-fields" className="p-4">
            <CRMCustomFieldsManager entityType="contact" />
          </TabsContent>

          <TabsContent value="company-fields" className="p-4">
            <CRMCustomFieldsManager entityType="company" />
          </TabsContent>

          <TabsContent value="tags" className="p-4">
            <CRMTagsManager />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default SettingsCRM;
