// Built-in content of the Developer and Audio pages. The admin can copy it into the database ("Load defaults")
// so every item becomes editable.
export const DEV_PROJECTS = [
  { title: 'Portfolio Website', desc: 'This site: a multi-path portfolio built with Vite, deployed with GitHub Actions.', tech: 'HTML, CSS, JavaScript, Vite', link: 'https://github.com/quangthong3005-ai/quangthong3005-ai.github.io', linkLabel: 'View on GitHub' },
  { title: 'GitHub Flow Practice', desc: 'Practice with issues, feature branches, pull requests, rebase and branch protection.', tech: 'Git, GitHub', link: 'https://github.com/quangthong3005-ai/quangthong3005-ai.github.io/pulls?q=is%3Apr', linkLabel: 'View pull requests' },
]
export const DEV_SKILLS = ['HTML', 'CSS', 'Tailwind CSS', 'JavaScript', 'Git & GitHub', 'GitHub Actions', 'Vite', 'npm'].map((name) => ({ name }))
export const DEV_EXP = [
  { period: '2026 – Present', title: 'Web Development Course', text: 'Learning Git, GitHub, HTML, Tailwind CSS and deployment with GitHub Actions.' },
]
export const PLUGINS = [
  { tag: 'Dynamics', name: 'Compressor', desc: 'Reduces the gap between the loudest and quietest parts of a signal, adding control and punch to vocals, keys and drums.' },
  { tag: 'Filter', name: 'EQ', desc: 'Shapes the tone by boosting or cutting chosen frequency bands to clean up muddiness, add presence and balance a mix.' },
  { tag: 'Dynamics', name: 'Noise Gate', desc: 'Silences the signal when it falls below a threshold, removing hiss, hum and background noise between notes and phrases.' },
  { tag: 'Harmonic', name: 'Saturation', desc: 'Adds gentle harmonic warmth and soft clipping, giving sounds analog-style thickness and helping tracks glue together.' },
  { tag: 'Harmonic', name: 'Enhancer', desc: 'Adds extra high-frequency harmonics to bring clarity, brightness and air to dull or flat recordings.' },
  { tag: 'Modulation', name: 'Chorus', desc: 'Blends the original sound with slightly delayed, pitch-modulated copies to create width and shimmer, ideal for keys and guitars.' },
  { tag: 'Harmonic', name: 'Distortion', desc: 'Pushes the signal into hard clipping for gritty, aggressive tones, from light crunch to full fuzz.' },
]
