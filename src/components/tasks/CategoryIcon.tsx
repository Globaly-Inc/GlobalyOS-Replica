import { lazy, Suspense } from 'react';
import type { LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

interface CategoryIconProps extends Omit<LucideProps, 'ref'> {
  iconName?: string | null;
  fallbackColor?: string | null;
}

const CategoryIcon = ({ iconName, fallbackColor, size = 14, ...props }: CategoryIconProps) => {
  if (!iconName) {
    if (fallbackColor) {
      return <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fallbackColor }} />;
    }
    return null;
  }

  // Normalize: the DB stores kebab-case names like "mail", "phone-call", "bell"
  const key = iconName.toLowerCase().trim() as keyof typeof dynamicIconImports;

  if (!(key in dynamicIconImports)) {
    if (fallbackColor) {
      return <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fallbackColor }} />;
    }
    return null;
  }

  const LucideIcon = lazy(dynamicIconImports[key]);

  return (
    <Suspense fallback={<div className="shrink-0" style={{ width: size, height: size }} />}>
      <LucideIcon size={size} {...props} />
    </Suspense>
  );
};

export default CategoryIcon;
