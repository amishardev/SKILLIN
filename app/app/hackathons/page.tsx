'use client';

import ComingSoon from '@/components/shell/ComingSoon';

export default function HackathonsPage() {
  return (
    <ComingSoon
      eyebrow="Hackathons"
      title="Hackathons are coming."
      lede="SkillIn will match hackathons to your skills, your goal and what you are actually eligible for, the same way it matches courses now."
      features={[
        {
          title: 'Personalised hackathons',
          body: 'Ranked by the skills you have confirmed and the gap the event would help you close, not by prize money.',
        },
        {
          title: 'Eligibility matching',
          body: 'Filtered by your year, your institution and the team size you can actually field.',
        },
        {
          title: 'Skill matching',
          body: 'Each listing will say which of your skills it uses and which one it would push you to learn.',
        },
        {
          title: 'Deadline tracking',
          body: 'Registration and submission dates sit alongside your roadmap so a deadline never arrives as a surprise.',
        },
      ]}
    />
  );
}
