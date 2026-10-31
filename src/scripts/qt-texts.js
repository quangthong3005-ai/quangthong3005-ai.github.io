// Texts that can be edited in the portfolio admin. `default` must match the text written in the HTML.
export const TEXT_FIELDS = [
  { key: 'heroLead', label: 'Home: line under the name', multi: true, default: "I'm a keyboardist who loves playing live and making music together with other people." },
  { key: 'aboutP1', label: 'About: first paragraph', multi: true, default: "I'm Quang Thong, a keyboardist with Dynamites Band. I love playing live and I take care of the details that make a song feel right on stage." },
  { key: 'aboutP2', label: 'About: second paragraph', multi: true, default: 'I also play with other bands and artists. Tell me about your show, recording or project and we can find the sound that fits it.' },
  { key: 'musicHint', label: 'Music: line under the title', multi: false, default: 'Press play to watch a performance.' },
  { key: 'contactLead', label: 'Contact: line under the title', multi: true, default: 'For shows, collaborations and questions, send me a message.' },
]
export const DEV_TEXTS = [
  { key: 'devLead', label: 'Home: line under the title', multi: true, default: 'I build websites and tools for the web, and I like making them feel alive.' },
  { key: 'devAbout', label: 'About: paragraph', multi: true, default: "I love programming and building things for the web. I'm learning web development with HTML, Tailwind CSS, Git and GitHub Actions, and my goal is to become a skilled software engineer." },
  { key: 'devContactBig', label: 'Contact: headline', multi: false, default: 'I LOOK FORWARD TO WORKING WITH YOU' },
  { key: 'devContact', label: 'Contact: sentence', multi: true, default: "I'm so happy that my skills might bring values to you. Let's connect for work." },
]
export const AUDIO_TEXTS = [
  { key: 'audLead', label: 'Home: line under the title', multi: true, default: 'I build effects for music production: dynamics, EQ, saturation and modulation.' },
  { key: 'audOverview', label: 'Role: overview', multi: true, default: 'Designs, builds and tests audio effect plugins that run inside digital audio workstations (DAWs). Turns signal processing ideas into reliable, great-sounding tools that musicians, producers and mix engineers can use in real production work.' },
  { key: 'audBring', label: 'Role: what I bring', multi: true, default: "A musician's ear and a developer's discipline. As a keyboardist, I know what a tool needs to feel like in a session, and I build effects with that in mind." },
  { key: 'audContact', label: 'Contact: sentence', multi: true, default: "Interested in a custom audio effect or a collaboration? Let's talk." },
]
