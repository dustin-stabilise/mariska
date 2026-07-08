import { requireRole } from "@/lib/auth-helpers";
import { PageHeading, Card } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProProfilePage() {
  const { supabase, user, profile } = await requireRole("professional");

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!pro) {
    return (
      <Card>
        <p className="text-muted">
          We couldn&apos;t find your professional profile. Please contact the team.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="My profile"
        intro="This is what families see when they find you in search, so keep it warm, specific and up to date."
      />
      <ProfileForm
        pro={{
          kind: pro.kind,
          headline: pro.headline,
          bio: pro.bio,
          location: pro.location,
          region: pro.region,
          years_experience: pro.years_experience,
          care_categories: pro.care_categories,
          availability_status: pro.availability_status,
          availability_options: pro.availability_options,
          hourly_rate_min: pro.hourly_rate_min,
          hourly_rate_max: pro.hourly_rate_max,
          languages: pro.languages,
          interests: pro.interests,
          gender: pro.gender,
          personality_style: pro.personality_style,
          comfortable_with: pro.comfortable_with,
          photo_url: pro.photo_url,
          intro_video_url: pro.intro_video_url,
          nmc_pin: pro.nmc_pin,
          can_drive: pro.can_drive,
        }}
        contact={{
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        }}
      />
    </div>
  );
}
