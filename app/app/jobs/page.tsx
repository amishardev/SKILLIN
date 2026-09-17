'use client';

import ComingSoon from '@/components/shell/ComingSoon';

export default function JobsPage() {
  return (
    <ComingSoon
      eyebrow="Jobs"
      title="Your next opportunity is coming."
      lede="SkillIn will match your skills, your projects and your target career with relevant internships and jobs."
      features={[
        {
          title: 'Personalised job matching',
          body: 'Roles ranked against your confirmed skills and your target career, not against a keyword search.',
        },
        {
          title: 'Skill gap detection',
          body: 'Each role will name the skills you are short of, and link to the resource that closes them.',
        },
        {
          title: 'Resume match',
          body: 'A read on how your profile lines up with a posting, using the same evidence model as your skill map.',
        },
        {
          title: 'Application tracking',
          body: 'Applied, interviewing, closed. Kept next to the roadmap it came from.',
        },
        {
          title: 'Internships',
          body: 'Student and new graduate openings held to the same eligibility rules as everything else here.',
        },
      ]}
    />
  );
}
