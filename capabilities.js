const capabilities = [
  ['figma-color.svg', 'Figma'],
  ['framer.svg', 'Framer'],
  ['design-systems.svg', 'Design Systems'],
  ['figma-variables.svg', 'Figma Variables'],
  ['accessibility.svg', 'Accessibility / ADA'],
  ['rtl-design.svg', 'RTL Design'],
  ['github.svg', 'GitHub'],
  ['vercel.svg', 'Vercel'],
  ['claude.svg', 'AI-Assisted Development'],
  ['responsive-ui.svg', 'Responsive UI'],
  ['information-architecture.svg', 'Information Architecture'],
  ['wireframing.svg', 'Wireframing'],
  ['html-css.svg', 'Basic HTML & CSS'],
  ['prototyping.svg', 'Prototyping'],
  ['website-maintenance.svg', 'Website Maintenance'],
];

const skills = document.querySelector('.skills');
if (skills) {
  skills.innerHTML = `<strong>Capabilities</strong><ul class="skills-grid" aria-label="Design and development capabilities">${capabilities.map(([icon, name]) => `<li class="skill-card"><img src="assets/icons/${icon}" alt="" aria-hidden="true"><span class="skill-name">${name}</span></li>`).join('')}</ul>`;
}
