const files={home:'entrainement',history:'historique',progress:'progression',ranking:'competition',body:'profil_homme'};
export function navigationIcon(key,gender='male'){
 const file=key==='body'&&gender==='female'?'profil_femme':files[key];
 return `<span class="provided-nav-icon" data-navigation-icon="${file}" aria-hidden="true" style="--nav-icon:url('./assets/navigation/${file}.svg')"></span>`;
}
export function profileGender(value){return value==='female'?'female':'male';}
export function appRecommendationUrl(url){return new URL('./',url).href;}
