/**
 * FAQ Page
 * Frequently asked questions organized by category
 */

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SupportLayout } from '@/components/support/SupportLayout';
import { FAQAccordion, SAMPLE_FAQ_ITEMS } from '@/components/support/FAQAccordion';

const FAQ_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'team', label: 'Team' },
  { id: 'leave', label: 'Leave' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'performance', label: 'Performance' },
  { id: 'wiki', label: 'Wiki' },
];

const SupportFAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredFAQs = SAMPLE_FAQ_ITEMS.filter((item) => {
    const matchesSearch = searchQuery.trim() === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <SupportLayout 
      title="Frequently Asked Questions"
      breadcrumbs={[{ label: 'FAQ' }]}
    >
      <div className="max-w-3xl">
        <p className="text-muted-foreground mb-6">
          Find quick answers to common questions about GlobalyOS.
        </p>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="flex-wrap h-auto gap-1">
            {FAQ_CATEGORIES.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="text-sm">
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* FAQ List */}
        <FAQAccordion items={filteredFAQs} />

        {/* No Results */}
        {filteredFAQs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No FAQ items match your search.</p>
            <p className="text-sm mt-2">Try different keywords or browse all categories.</p>
          </div>
        )}
      </div>
    </SupportLayout>
  );
};

export default SupportFAQ;
