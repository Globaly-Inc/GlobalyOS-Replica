import {
  Monitor,
  Code,
  Shield,
  Database,
  Briefcase,
  Scale,
  DollarSign,
  Users,
  GraduationCap,
  BookOpen,
  Plane,
  Heart,
  Stethoscope,
  Landmark,
  Home,
  Building,
  Palette,
  ShoppingCart,
  Factory,
  Truck,
  Megaphone,
  Hotel,
  Utensils,
  Calendar,
  Leaf,
  Zap,
  Phone,
  Trophy,
  Church,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';

export interface BusinessCategory {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // Technology & IT
  { value: 'Technology', label: 'Technology', icon: Monitor },
  { value: 'IT Services & Consulting', label: 'IT Services & Consulting', icon: Monitor },
  { value: 'Software Development', label: 'Software Development', icon: Code },
  { value: 'Cybersecurity', label: 'Cybersecurity', icon: Shield },
  { value: 'Data & Analytics', label: 'Data & Analytics', icon: Database },
  
  // Professional Services
  { value: 'Professional Services', label: 'Professional Services', icon: Briefcase },
  { value: 'Legal Firm', label: 'Legal Firm', icon: Scale },
  { value: 'Tax & Accounting Firm', label: 'Tax & Accounting Firm', icon: DollarSign },
  { value: 'Management Consulting', label: 'Management Consulting', icon: Briefcase },
  { value: 'HR Consulting', label: 'HR Consulting', icon: Users },
  { value: 'Business Consulting', label: 'Business Consulting', icon: Briefcase },
  
  // Education
  { value: 'Education', label: 'Education', icon: GraduationCap },
  { value: 'Education Consultancy', label: 'Education Consultancy', icon: GraduationCap },
  { value: 'Training & Coaching', label: 'Training & Coaching', icon: BookOpen },
  { value: 'E-Learning', label: 'E-Learning', icon: Monitor },
  
  // Immigration & Legal
  { value: 'Migration Agency', label: 'Migration Agency', icon: Plane },
  { value: 'Immigration Services', label: 'Immigration Services', icon: Plane },
  
  // Healthcare
  { value: 'Healthcare', label: 'Healthcare', icon: Heart },
  { value: 'Medical Practice', label: 'Medical Practice', icon: Stethoscope },
  { value: 'Dental Practice', label: 'Dental Practice', icon: Heart },
  { value: 'Allied Health Services', label: 'Allied Health Services', icon: Heart },
  { value: 'Pharmacy', label: 'Pharmacy', icon: Heart },
  { value: 'Mental Health Services', label: 'Mental Health Services', icon: Heart },
  
  // Finance
  { value: 'Finance & Banking', label: 'Finance & Banking', icon: Landmark },
  { value: 'Insurance', label: 'Insurance', icon: Shield },
  { value: 'Financial Advisory', label: 'Financial Advisory', icon: DollarSign },
  { value: 'Wealth Management', label: 'Wealth Management', icon: DollarSign },
  { value: 'Fintech', label: 'Fintech', icon: Landmark },
  
  // Real Estate & Property
  { value: 'Real Estate', label: 'Real Estate', icon: Home },
  { value: 'Property Management', label: 'Property Management', icon: Building },
  { value: 'Construction', label: 'Construction', icon: Building },
  { value: 'Architecture & Design', label: 'Architecture & Design', icon: Palette },
  
  // Retail & Commerce
  { value: 'Retail & E-commerce', label: 'Retail & E-commerce', icon: ShoppingCart },
  { value: 'Wholesale & Distribution', label: 'Wholesale & Distribution', icon: ShoppingCart },
  
  // Manufacturing & Industry
  { value: 'Manufacturing', label: 'Manufacturing', icon: Factory },
  { value: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain', icon: Truck },
  { value: 'Automotive', label: 'Automotive', icon: Truck },
  
  // Creative & Media
  { value: 'Media & Entertainment', label: 'Media & Entertainment', icon: Palette },
  { value: 'Advertising & Marketing', label: 'Advertising & Marketing', icon: Megaphone },
  { value: 'Design Agency', label: 'Design Agency', icon: Palette },
  { value: 'Digital Marketing', label: 'Digital Marketing', icon: Megaphone },
  
  // Hospitality & Travel
  { value: 'Hospitality', label: 'Hospitality', icon: Hotel },
  { value: 'Travel & Tourism', label: 'Travel & Tourism', icon: Plane },
  { value: 'Food & Beverage', label: 'Food & Beverage', icon: Utensils },
  { value: 'Event Management', label: 'Event Management', icon: Calendar },
  
  // Other Sectors
  { value: 'Non-profit', label: 'Non-profit', icon: Users },
  { value: 'Government', label: 'Government', icon: Landmark },
  { value: 'Agriculture', label: 'Agriculture', icon: Leaf },
  { value: 'Energy & Utilities', label: 'Energy & Utilities', icon: Zap },
  { value: 'Telecommunications', label: 'Telecommunications', icon: Phone },
  { value: 'Transportation', label: 'Transportation', icon: Truck },
  { value: 'Sports & Recreation', label: 'Sports & Recreation', icon: Trophy },
  { value: 'Religious Organization', label: 'Religious Organization', icon: Church },
  { value: 'Other', label: 'Other', icon: HelpCircle },
];

export const getBusinessCategoryIcon = (industry: string | null | undefined): LucideIcon => {
  const category = BUSINESS_CATEGORIES.find(c => c.value === industry);
  return category?.icon || Briefcase;
};

export const getBusinessCategoryLabel = (industry: string | null | undefined): string => {
  const category = BUSINESS_CATEGORIES.find(c => c.value === industry);
  return category?.label || industry || 'Not specified';
};
