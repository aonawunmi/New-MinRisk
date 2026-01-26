import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface LogoUploaderProps {
    currentLogoUrl: string | null;
    onLogoUpdated: (newUrl: string | null) => void;
}

export default function LogoUploader({ currentLogoUrl, onLogoUpdated }: LogoUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // Validate size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }

        setUploading(true);

        try {
            // 1. Upload to Supabase Storage
            // Filename logic: org_id + timestamp + extension to avoid cache issues?
            // Or just 'org_{id}.png' and overwrite? Overwriting is cleaner for URL usage.

            // We need the org ID. Assuming the caller validates permissions.
            // But to name the file safely, we should fetch the org ID or use a UUID for the file
            // and store that path.

            // Actually, let's use a random ID for the file so we don't have caching issues on update.
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('org-logos')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('org-logos')
                .getPublicUrl(filePath);

            // 3. Update Organization Record
            // We call the RPC to safely update the org record
            const { error: dbError } = await supabase.rpc('update_org_logo', {
                p_logo_url: publicUrl
            });

            if (dbError) {
                throw dbError;
            }

            setPreviewUrl(publicUrl);
            onLogoUpdated(publicUrl);

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveLogo = async () => {
        if (!confirm('Are you sure you want to remove the logo?')) return;

        setUploading(true);
        try {
            const { error } = await supabase.rpc('update_org_logo', {
                p_logo_url: null
            });

            if (error) throw error;

            setPreviewUrl(null);
            onLogoUpdated(null);
        } catch (error: any) {
            console.error('Remove failed:', error);
            alert('Failed to remove logo: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-start gap-6">
            <div className="relative group shrink-0">
                <div className="w-40 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Organization Logo"
                            className="max-w-full max-h-full object-contain p-2"
                        />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                </div>

                {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div>
                    <h4 className="font-medium text-sm">Brand Logo</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                        Upload your organization's logo. Recommended size: 200x80px.
                        Max 2MB.
                    </p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                    </Button>

                    {previewUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={uploading}
                            onClick={handleRemoveLogo}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
