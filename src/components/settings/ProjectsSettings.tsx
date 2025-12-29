import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Briefcase, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Upload,
  FileText,
  X,
  Sparkles,
  User,
  Search,
  Camera,
  ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/services/useEmployees";
import { icons } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectsSettingsProps {
  organizationId?: string;
}

interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  project_lead_id: string | null;
  secondary_lead_id: string | null;
  logo_url: string | null;
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

// Extended icon options - 50+ icons organized by category
const iconOptions = [
  // General
  "folder", "briefcase", "rocket", "target", "zap", "star", "heart", "flag",
  "award", "trophy", "bookmark", "tag", "hash", "at-sign",
  // Tech
  "globe", "layers", "box", "package", "database", "cloud", "code", "terminal",
  "cpu", "smartphone", "monitor", "server", "wifi", "hard-drive", "git-branch",
  // Media
  "camera", "music", "video", "image", "file-text", "file", "book", "newspaper",
  "mic", "headphones", "tv", "radio",
  // People & Places
  "users", "building", "building-2", "home", "map", "compass", "map-pin", "navigation",
  // Time & Alerts
  "calendar", "clock", "bell", "alarm-clock", "timer", "hourglass",
  // Business
  "trending-up", "bar-chart", "pie-chart", "dollar-sign", "credit-card", "shopping-cart",
  "shopping-bag", "receipt", "wallet", "banknote",
  // Security
  "shield", "lock", "key", "eye", "fingerprint",
  // Transport
  "truck", "plane", "ship", "car", "bike",
  // Nature & Other
  "sun", "moon", "leaf", "tree", "mountain", "umbrella", "coffee", "lightbulb",
  "puzzle", "gamepad-2", "palette", "pen-tool", "scissors", "wrench", "settings"
];

const colorOptions = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", 
  "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#a855f7"
];

const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const IconComponent = (icons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || icons.Folder;
  return <IconComponent className={className} style={style} />;
};

export const ProjectsSettings = ({ organizationId }: ProjectsSettingsProps) => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState("#3b82f6");
  const [description, setDescription] = useState("");
  const [projectLeadId, setProjectLeadId] = useState<string | null>(null);
  const [secondaryLeadId, setSecondaryLeadId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Icon picker state
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [logoMode, setLogoMode] = useState<"icon" | "custom">("icon");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Documents state
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Employees for lead selection
  const { data: employeesData } = useEmployees({ status: 'active' });
  const employees = (employeesData || []) as any[];

  // Filter icons based on search
  const filteredIcons = iconOptions.filter(i => 
    i.toLowerCase().includes(iconSearch.toLowerCase())
  );

  useEffect(() => {
    if (organizationId) {
      loadProjects();
    }
  }, [organizationId]);

  const loadProjects = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, icon, color, description, project_lead_id, secondary_lead_id, logo_url")
        .eq("organization_id", organizationId)
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (projectId: string) => {
    const { data, error } = await supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
  };

  const openNewProject = () => {
    setEditingProject(null);
    setName("");
    setIcon("folder");
    setColor("#3b82f6");
    setDescription("");
    setProjectLeadId(null);
    setSecondaryLeadId(null);
    setLogoUrl(null);
    setLogoMode("icon");
    setDocuments([]);
    setDialogOpen(true);
  };

  const openEditProject = async (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setIcon(project.icon);
    setColor(project.color);
    setDescription(project.description || "");
    setProjectLeadId(project.project_lead_id);
    setSecondaryLeadId(project.secondary_lead_id);
    setLogoUrl(project.logo_url);
    setLogoMode(project.logo_url ? "custom" : "icon");
    await loadDocuments(project.id);
    setDialogOpen(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organizationId) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PNG, JPG, SVG, or WebP images.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-logo.${fileExt}`;
      const filePath = `${organizationId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("project-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("project-logos")
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    setLogoMode("icon");
  };

  const handleSave = async () => {
    if (!organizationId || !name.trim()) return;
    setSaving(true);
    try {
      const projectData = {
        name: name.trim(),
        icon,
        color,
        description: description.trim() || null,
        project_lead_id: projectLeadId,
        secondary_lead_id: secondaryLeadId,
        logo_url: logoMode === "custom" ? logoUrl : null,
      };

      if (editingProject) {
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", editingProject.id);

        if (error) throw error;
        toast({ title: "Project updated" });
      } else {
        const { error } = await supabase
          .from("projects")
          .insert({
            ...projectData,
            organization_id: organizationId,
          });

        if (error) throw error;
        toast({ title: "Project created" });
      }

      setDialogOpen(false);
      loadProjects();
    } catch (error: any) {
      toast({
        title: "Error saving project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProjectId) return;
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", deleteProjectId);

      if (error) throw error;
      toast({ title: "Project deleted" });
      setDeleteProjectId(null);
      loadProjects();
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingProject || !organizationId) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, DOC, DOCX, TXT, or MD files.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingDoc(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${organizationId}/${editingProject.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: employeeData } = await supabase
        .from("employees")
        .select("id")
        .eq("organization_id", organizationId)
        .single();

      // Parse document content for AI context
      let parsedContent: string | null = null;
      try {
        const isTextFile = file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.txt');
        
        if (isTextFile) {
          // Read text files directly
          parsedContent = await file.text();
        } else {
          // Use edge function for binary documents (PDF, DOCX)
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-document-content', {
            body: { 
              fileContent: base64, 
              fileName: file.name,
              mimeType: file.type 
            }
          });
          
          if (!parseError && parseData?.text) {
            parsedContent = parseData.text;
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse document content:", parseErr);
        // Non-fatal: document still uploaded, just won't have AI context
      }

      const { error: docError } = await supabase
        .from("project_documents")
        .insert({
          project_id: editingProject.id,
          organization_id: organizationId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: employeeData?.id || null,
          parsed_content: parsedContent?.slice(0, 50000), // Limit stored content to 50k chars
        });

      if (docError) throw docError;

      toast({ 
        title: "Document uploaded",
        description: parsedContent ? "Content indexed for AI assistance" : undefined
      });
      loadDocuments(editingProject.id);
    } catch (error: any) {
      toast({
        title: "Error uploading document",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocument = async (doc: ProjectDocument) => {
    try {
      await supabase.storage
        .from("project-documents")
        .remove([doc.file_path]);

      const { error } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      toast({ title: "Document deleted" });
      if (editingProject) {
        loadDocuments(editingProject.id);
      }
    } catch (error: any) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return null;
    const employee = employees.find((e: any) => e.id === employeeId);
    return employee?.profiles?.full_name || employee?.full_name || null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Projects Settings
          </CardTitle>
          <CardDescription>
            Manage project details, team leads, and documentation for AI context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Integration Note */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">AI-Enhanced Projects</p>
              <p className="text-sm text-muted-foreground">
                Project details and documents help AI provide better KPI suggestions and context-aware recommendations.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={openNewProject} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects found. Create your first project above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {project.logo_url ? (
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={project.logo_url} className="object-cover" />
                        <AvatarFallback className="rounded-lg" style={{ backgroundColor: `${project.color}20` }}>
                          <DynamicIcon name={project.icon} className="h-5 w-5" style={{ color: project.color }} />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${project.color}20` }}
                      >
                        <DynamicIcon 
                          name={project.icon} 
                          className="h-5 w-5" 
                          style={{ color: project.color }} 
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{project.name}</p>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {project.project_lead_id && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{getEmployeeName(project.project_lead_id) || "Lead"}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditProject(project)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteProjectId(project.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Add New Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update project details and documentation."
                : "Create a new project with details for AI context."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Website Redesign"
                />
              </div>

              {/* Icon / Logo Selection */}
              <div className="space-y-3">
                <Label>Icon / Logo</Label>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <Tabs value={logoMode} onValueChange={(v) => setLogoMode(v as "icon" | "custom")}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="icon" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Icon
                      </TabsTrigger>
                      <TabsTrigger value="custom" className="gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Custom Logo
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="icon" className="space-y-4">
                      <div className="flex items-start gap-4">
                        {/* Icon Preview */}
                        <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="h-16 w-16 rounded-xl flex items-center justify-center border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                              style={{ backgroundColor: `${color}20` }}
                            >
                              <DynamicIcon 
                                name={icon} 
                                className="h-8 w-8" 
                                style={{ color }} 
                              />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="start">
                            <div className="space-y-3">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search icons..."
                                  value={iconSearch}
                                  onChange={(e) => setIconSearch(e.target.value)}
                                  className="pl-8 h-9"
                                />
                              </div>
                              <ScrollArea className="h-[200px]">
                                <div className="grid grid-cols-8 gap-1">
                                  {filteredIcons.map((i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      className={cn(
                                        "h-8 w-8 rounded flex items-center justify-center hover:bg-accent transition-colors",
                                        icon === i && "bg-primary/10 ring-1 ring-primary"
                                      )}
                                      onClick={() => {
                                        setIcon(i);
                                        setIconPickerOpen(false);
                                        setIconSearch("");
                                      }}
                                      title={i}
                                    >
                                      <DynamicIcon name={i} className="h-4 w-4" style={{ color }} />
                                    </button>
                                  ))}
                                </div>
                                {filteredIcons.length === 0 && (
                                  <p className="text-center text-sm text-muted-foreground py-4">
                                    No icons found
                                  </p>
                                )}
                              </ScrollArea>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Click the icon to browse and select from 50+ options
                          </p>
                          {/* Color Selection */}
                          <div className="flex flex-wrap gap-2">
                            {colorOptions.map((c) => (
                              <button
                                key={c}
                                type="button"
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 transition-all",
                                  color === c ? "border-foreground scale-110" : "border-transparent"
                                )}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="custom" className="space-y-4">
                      <div className="flex items-center gap-4">
                        {/* Logo Preview / Upload Area */}
                        <div className="relative">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className={cn(
                              "h-16 w-16 rounded-xl flex items-center justify-center border-2 border-dashed transition-colors overflow-hidden",
                              logoUrl 
                                ? "border-transparent" 
                                : "hover:border-primary/50 bg-muted/50"
                            )}
                          >
                            {uploadingLogo ? (
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt="Project logo" 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Camera className="h-6 w-6 text-muted-foreground" />
                            )}
                          </button>
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {logoUrl ? "Logo uploaded" : "Upload project logo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, SVG, or WebP (max 2MB)
                          </p>
                          {!logoUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                              className="mt-2 gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Upload
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project goals, scope, and key objectives..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This description helps AI understand the project context for better suggestions.
              </p>
            </div>

            {/* Team Leads */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Lead</Label>
                <Select 
                  value={projectLeadId || "none"} 
                  onValueChange={(v) => setProjectLeadId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lead assigned</SelectItem>
                    {(employees as any[]).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={emp.profiles?.avatar_url || emp.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {(emp.profiles?.full_name || emp.full_name)?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{emp.profiles?.full_name || emp.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secondary Lead (Optional)</Label>
                <Select 
                  value={secondaryLeadId || "none"} 
                  onValueChange={(v) => setSecondaryLeadId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No secondary lead</SelectItem>
                    {(employees as any[]).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={emp.profiles?.avatar_url || emp.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {(emp.profiles?.full_name || emp.full_name)?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{emp.profiles?.full_name || emp.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Documents - Only show when editing */}
            {editingProject && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Project Documents</Label>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingDoc}
                      className="gap-2"
                    >
                      {uploadingDoc ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Document
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload strategy docs, project briefs, or any documents to enhance AI context. Supports PDF, DOC, DOCX, TXT, MD.
                </p>

                {documents.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingProject ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project, remove it from all employees, and delete all associated documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
