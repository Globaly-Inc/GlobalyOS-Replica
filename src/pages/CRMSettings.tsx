/**
 * CRM Settings Page
 * Tabs: Custom Fields (Contacts), Custom Fields (Companies), Tags
 */
import { OrgLink } from '@/components/OrgLink';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { CRMCustomFieldsManager } from '@/components/crm/CRMCustomFieldsManager';
import { CRMTagsManager } from '@/components/crm/CRMTagsManager';
import { PageBody } from '@/components/ui/page-body';

const CRMSettings = () => {
  return (
    <PageBody>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between pt-[10px]">
          <OrgLink to="/crm">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to CRM
            </Button>
          </OrgLink>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage custom fields and tags for your CRM.</p>
        </div>

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
    </PageBody>
  );
};

export default CRMSettings;
