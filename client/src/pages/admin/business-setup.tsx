import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  LayoutGrid, 
  FileEdit, 
  Plus, 
  Trash2, 
  Save, 
  X,
  Loader2,
  ExternalLink,
  Globe,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin
} from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";

// Form schemas
const pageContentSchema = z.object({
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.string().min(2, "Category is required"),
  isPublished: z.boolean().default(true)
});

const contactSettingsSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Please enter a valid email"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional()
});

type PageContentFormValues = z.infer<typeof pageContentSchema>;
type ContactSettingsFormValues = z.infer<typeof contactSettingsSchema>;

export default function BusinessSetup() {
  const { toast } = useToast();
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  
  interface PageContent {
    id: number;
    slug: string;
    title: string;
    content: string;
    category: string;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  interface AppSetting {
    id: number;
    key: string;
    value: string;
    createdAt: string;
    updatedAt: string;
  }

  // Fetch all page content
  const { 
    data: pages = [] as PageContent[], 
    isLoading: isPagesLoading,
    refetch: refetchPages
  } = useQuery<PageContent[]>({
    queryKey: ['/api/admin/page-contents']
  });
  
  // Fetch contact settings from app settings
  const {
    data: appSettings = [] as AppSetting[],
    isLoading: isSettingsLoading,
    refetch: refetchSettings
  } = useQuery<AppSetting[]>({
    queryKey: ['/api/admin/settings']
  });
  
  // Get contact settings
  const getSettingValue = (key: string) => {
    const setting = appSettings.find((s: AppSetting) => s.key === key);
    return setting ? setting.value : '';
  };
  
  // Contact settings form
  const contactForm = useForm<ContactSettingsFormValues>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: {
      phone: getSettingValue('contact_phone') || '',
      email: getSettingValue('contact_email') || '',
      address: getSettingValue('contact_address') || '',
      facebookUrl: getSettingValue('social_facebook') || '',
      twitterUrl: getSettingValue('social_twitter') || '',
      instagramUrl: getSettingValue('social_instagram') || '',
      linkedinUrl: getSettingValue('social_linkedin') || ''
    }
  });
  
  // Update form values when settings are loaded
  useEffect(() => {
    if (appSettings && appSettings.length > 0) {
      contactForm.setValue('phone', getSettingValue('contact_phone') || '');
      contactForm.setValue('email', getSettingValue('contact_email') || '');
      contactForm.setValue('address', getSettingValue('contact_address') || '');
      contactForm.setValue('facebookUrl', getSettingValue('social_facebook') || '');
      contactForm.setValue('twitterUrl', getSettingValue('social_twitter') || '');
      contactForm.setValue('instagramUrl', getSettingValue('social_instagram') || '');
      contactForm.setValue('linkedinUrl', getSettingValue('social_linkedin') || '');
    }
  }, [appSettings]);
  
  // Page content form
  const pageForm = useForm<PageContentFormValues>({
    resolver: zodResolver(pageContentSchema),
    defaultValues: {
      slug: '',
      title: '',
      content: '',
      category: 'support',
      isPublished: true
    }
  });
  
  // Create or update page content
  const pageMutation = useMutation({
    mutationFn: async (data: PageContentFormValues) => {
      if (editingPage) {
        return apiRequest('PATCH', `/api/admin/page-contents/${editingPage.id}`, data);
      } else {
        return apiRequest('POST', '/api/admin/page-contents', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/page-contents'] });
      toast({
        title: editingPage ? "Page updated" : "Page created",
        description: editingPage 
          ? `The page "${pageForm.getValues().title}" has been updated.` 
          : `The page "${pageForm.getValues().title}" has been created.`,
      });
      setShowPageDialog(false);
      setEditingPage(null);
      pageForm.reset();
      refetchPages();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingPage ? 'update' : 'create'} page. Please try again.`,
        variant: "destructive"
      });
    }
  });
  
  // Delete page content
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/admin/page-contents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/page-contents'] });
      toast({
        title: "Page deleted",
        description: "The page has been deleted successfully."
      });
      refetchPages();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the page. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Update app settings
  type SettingUpdate = {
    key: string;
    value: string;
  };
  
  const updateSettingMutation = useMutation({
    mutationFn: (data: SettingUpdate) => {
      return apiRequest('PUT', '/api/admin/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Handle contact form submission
  const onContactSubmit = (data: ContactSettingsFormValues) => {
    const settings = [
      { key: 'contact_phone', value: data.phone },
      { key: 'contact_email', value: data.email },
      { key: 'contact_address', value: data.address },
      { key: 'social_facebook', value: data.facebookUrl || '' },
      { key: 'social_twitter', value: data.twitterUrl || '' },
      { key: 'social_instagram', value: data.instagramUrl || '' },
      { key: 'social_linkedin', value: data.linkedinUrl || '' }
    ];
    
    // Update each setting one by one
    Promise.all(
      settings.map(setting => updateSettingMutation.mutateAsync(setting))
    )
      .then(() => {
        toast({
          title: "Settings updated",
          description: "Contact and social media settings have been updated successfully."
        });
        refetchSettings();
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to update some settings. Please try again.",
          variant: "destructive"
        });
      });
  };
  
  // Handle page form submission
  const onPageSubmit = (data: PageContentFormValues) => {
    pageMutation.mutate(data);
  };
  
  // Edit page
  const handleEditPage = (page: PageContent) => {
    setEditingPage(page);
    pageForm.reset({
      slug: page.slug,
      title: page.title,
      content: page.content,
      category: page.category,
      isPublished: page.isPublished
    });
    setShowPageDialog(true);
  };
  
  // Add new page
  const handleAddPage = () => {
    setEditingPage(null);
    pageForm.reset({
      slug: '',
      title: '',
      content: '',
      category: 'support',
      isPublished: true
    });
    setShowPageDialog(true);
  };
  
  // Delete page
  const handleDeletePage = (id: number) => {
    if (confirm("Are you sure you want to delete this page? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };
  
  // Group pages by category
  const pagesByCategory = pages.reduce<Record<string, PageContent[]>>((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {});
  
  // Loading states
  const isLoadingAny = isPagesLoading || isSettingsLoading;
  const isUpdatingAny = pageMutation.isPending || deleteMutation.isPending || updateSettingMutation.isPending;
  
  return (
    <AdminLayout title="Business Setup">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Business Setup</h1>
        
        {isLoadingAny && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading...</span>
          </div>
        )}
        
        {!isLoadingAny && (
          <Tabs defaultValue="contact" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="contact" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>Contact & Social</span>
              </TabsTrigger>
              <TabsTrigger value="pages" className="flex items-center gap-1">
                <LayoutGrid className="h-4 w-4" />
                <span>Page Management</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Contact & Social Media Settings */}
            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information & Social Media</CardTitle>
                  <CardDescription>
                    Update your contact information and social media links that will be displayed on the website.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...contactForm}>
                    <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Contact Information
                          </h3>
                          
                          <FormField
                            control={contactForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input placeholder="+91 1234567890" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={contactForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input placeholder="contact@oyegaadi.com" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={contactForm.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Address</FormLabel>
                                <FormControl>
                                  <div className="flex items-start">
                                    <MapPin className="h-4 w-4 mr-2 mt-2 text-muted-foreground" />
                                    <Textarea placeholder="123 Main Street, City, State, Pincode" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Social Media Links
                          </h3>
                          
                          <FormField
                            control={contactForm.control}
                            name="facebookUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Facebook</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Facebook className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input placeholder="https://facebook.com/oyegaadi" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={contactForm.control}
                            name="twitterUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twitter</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Twitter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input placeholder="https://twitter.com/oyegaadi" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={contactForm.control}
                            name="instagramUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instagram</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Instagram className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input placeholder="https://instagram.com/oyegaadi" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={contactForm.control}
                            name="linkedinUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Linkedin className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input placeholder="https://linkedin.com/company/oyegaadi" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={isUpdatingAny || contactForm.formState.isSubmitting}
                          className="flex items-center gap-2"
                        >
                          {contactForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          <Save className="h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Page Management */}
            <TabsContent value="pages">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Page Management</CardTitle>
                    <CardDescription>
                      Create and manage website pages such as terms of service, privacy policy, etc.
                    </CardDescription>
                  </div>
                  <Button onClick={handleAddPage} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Page
                  </Button>
                </CardHeader>
                <CardContent>
                  {Object.keys(pagesByCategory).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No pages found. Click the "Add New Page" button to create your first page.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(pagesByCategory).map(([category, categoryPages]: [string, PageContent[]]) => (
                        <div key={category}>
                          <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <Badge variant="outline" className="mr-2 capitalize">{category}</Badge>
                            <span>Pages</span>
                          </h3>
                          <div className="grid gap-4">
                            {categoryPages.map((page: PageContent) => (
                              <div key={page.id} className="border rounded-md p-4 group">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-base font-medium">{page.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      /{page.slug}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <Badge variant={page.isPublished ? "default" : "outline"}>
                                        {page.isPublished ? "Published" : "Draft"}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        Last updated: {new Date(page.updatedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleEditPage(page)}
                                      className="h-8 gap-1"
                                    >
                                      <FileEdit className="h-3.5 w-3.5" />
                                      Edit
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={() => handleDeletePage(page.id)}
                                      className="h-8 gap-1"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 gap-1"
                                      asChild
                                    >
                                      <a 
                                        href={`/page/${page.slug}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        View
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* Page Create/Edit Dialog */}
        <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
              <DialogDescription>
                {editingPage 
                  ? "Update the content and settings for this page." 
                  : "Create a new page for your website."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...pageForm}>
              <form onSubmit={pageForm.handleSubmit(onPageSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={pageForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Terms of Service" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={pageForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <span className="mr-1 text-muted-foreground">/page/</span>
                            <Input placeholder="terms-of-service" {...field} />
                          </div>
                        </FormControl>
                        <FormDescription>
                          This will be the URL path of your page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={pageForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="support">Support</option>
                          <option value="legal">Legal</option>
                          <option value="about">About</option>
                          <option value="help">Help & Resources</option>
                        </select>
                      </FormControl>
                      <FormDescription>
                        Categorize your page to organize content.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pageForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your page content here..." 
                          className="min-h-[300px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        You can use markdown formatting for rich content.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={pageForm.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-1"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Published</FormLabel>
                        <FormDescription>
                          If checked, this page will be visible to all users. Otherwise, it will be saved as a draft.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPageDialog(false)}
                    className="gap-1"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={pageMutation.isPending}
                    className="gap-1"
                  >
                    {pageMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    {editingPage ? "Update Page" : "Create Page"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}