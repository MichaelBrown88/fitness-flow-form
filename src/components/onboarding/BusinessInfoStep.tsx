import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, User, Building, ArrowRight, Upload, X } from 'lucide-react';
import { BUSINESS_TYPES, type BusinessProfileData, type BusinessType } from '@/types/onboarding';
import { useState, useRef } from 'react';

interface BusinessInfoStepProps {
  data?: Partial<BusinessProfileData>;
  onNext: (data: BusinessProfileData) => void;
}

export function BusinessInfoStep({ data, onNext }: BusinessInfoStepProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Omit<BusinessProfileData, 'logoFile'>>({
    defaultValues: {
      name: data?.name || '',
      type: data?.type || 'solo_coach',
      address: data?.address || '',
      phone: data?.phone || '',
      website: data?.website || '',
    },
  });

  const selectedType = watch('type');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file must be under 2MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setLogoFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getIcon = (type: BusinessType) => {
    switch (type) {
      case 'solo_coach': return User;
      case 'gym': return Building2;
      case 'gym_chain': return Building;
    }
  };

  const onSubmit = (formData: Omit<BusinessProfileData, 'logoFile'>) => {
    onNext({
      ...formData,
      logoFile: logoFile || undefined,
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Tell us about your business
        </h1>
        <p className="text-foreground-secondary">
          This information will personalize your experience and appear on client reports.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Type */}
        <div className="space-y-3">
          <Label>What type of business are you?</Label>
          <RadioGroup
            value={selectedType}
            onValueChange={(value) => setValue('type', value as BusinessType)}
            className="grid grid-cols-1 gap-3"
          >
            {BUSINESS_TYPES.map((type) => {
              const Icon = getIcon(type.value);
              return (
                <label
                  key={type.value}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedType === type.value
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-border hover:border-indigo-200'
                  }`}
                >
                  <RadioGroupItem value={type.value} className="sr-only" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedType === type.value ? 'bg-indigo-100' : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      selectedType === type.value ? 'text-indigo-600' : 'text-foreground-secondary'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <span className={`font-semibold text-base ${
                      selectedType === type.value ? 'text-indigo-600' : 'text-foreground'
                    }`}>
                      {type.label}
                    </span>
                    <p className="text-sm text-foreground-secondary mt-0.5">
                      {type.description}
                    </p>
                    <p className="text-xs text-foreground-tertiary mt-1">
                      {type.details}
                    </p>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            {selectedType === 'solo_coach' ? 'Your name or business name' : 'Business name'}
          </Label>
          <Input
            id="name"
            placeholder={selectedType === 'solo_coach' ? 'John Smith Coaching' : 'Iron Works Gym'}
            {...register('name', { required: 'Business name is required' })}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <Label htmlFor="logo-upload">Logo (optional)</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <div className="w-20 h-20 rounded-xl border border-border overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="logo-upload"
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-indigo-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-foreground-tertiary" />
              </label>
            )}
            <div className="text-sm text-foreground-secondary">
              {logoPreview ? (
                <p className="text-emerald-600 font-medium">Logo uploaded ✓</p>
              ) : (
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <p>Click to upload your logo</p>
                  <p className="text-xs text-foreground-tertiary">PNG, JPG up to 2MB</p>
                </label>
              )}
            </div>
            <input
              id="logo-upload"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleLogoChange}
              className="sr-only"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Business address</Label>
          <Input
            id="address"
            placeholder="123 Fitness Street, City, State"
            {...register('address', { required: 'Address is required' })}
            className={errors.address ? 'border-red-500' : ''}
          />
          {errors.address && (
            <p className="text-xs text-red-500">{errors.address.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            {...register('phone', { required: 'Phone number is required' })}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Website (optional)</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://www.yourgym.com"
            {...register('website')}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 gradient-bg text-white rounded-xl text-base font-semibold"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
