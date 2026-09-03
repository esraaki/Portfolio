const capabilities = [
  ['figma-color.svg', 'Figma'],
  ['framer.svg', 'Framer'],
  ['design-systems.png', 'Design Systems'],
  ['figma-variables.png', 'Figma Variables'],
  ['accessibility.png', 'Accessibility / ADA'],
  ['rtl-design.png', 'RTL Design'],
  ['github.svg', 'GitHub'],
  ['vercel.svg', 'Vercel'],
  ['claude.svg', 'AI-Assisted Development'],
  ['responsive-ui.svg', 'Responsive UI'],
  ['information-architecture.svg', 'Information Architecture'],
  ['wireframing.svg', 'Wireframing'],
  ['html-css.svg', 'Basic HTML & CSS'],
  ['prototyping.png', 'Prototyping'],
  ['website-maintenance.png', 'Website Maintenance'],
];

const skills = document.querySelector('.skills');
if (skills) {
  skills.innerHTML = `<strong>Capabilities</strong><ul class="skills-grid" aria-label="Design and development capabilities">${capabilities.map(([icon, name]) => `<li class="skill-card"><img src="assets/icons/${icon}" alt="" aria-hidden="true"><span class="skill-name">${name}</span></li>`).join('')}</ul>`;
}
