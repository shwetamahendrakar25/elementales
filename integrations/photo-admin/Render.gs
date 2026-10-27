/** Pure rendering/validation, shared by private previews and published pages. */
var PHOTO_CATEGORIES_ = ['weddings', 'maternity', 'family', 'dreamy-projects', 'slideshow', 'about'];
var PHOTO_LABELS_ = {weddings:'Weddings', maternity:'Maternity', family:'Family', 'dreamy-projects':'Dreamy Projects', slideshow:'Homepage Slideshow', about:'About'};
var PHOTO_PAGES_ = ['index.html','weddings.html','maternity.html','family.html','dreamy-projects.html','about.html'];
function escapePhoto_(value) {
  return String(value).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
function validatePhotoManifest_(manifest) {
  if (!manifest || manifest.schema !== 1 || !manifest.categories || !manifest.settings || manifest.settings.watermarkOpacity !== 0.55 || manifest.settings.watermarkSize !== 'standard') throw new Error('Invalid photo version.');
  PHOTO_CATEGORIES_.forEach(function(category) {
    var items = manifest.categories[category];
    if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error(PHOTO_LABELS_[category] + ' must contain between 1 and 100 photos.');
    if (category === 'slideshow' && items.length !== 5) throw new Error('Keep exactly five photos in Homepage Slideshow.');
    if (category === 'about' && items.length !== 1) throw new Error('Keep exactly one portrait in About.');
    var keys = {};
    items.forEach(function(photo) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(photo.key) || keys[photo.key]) throw new Error('Invalid or duplicate photo key.');
      keys[photo.key] = true;
      if (typeof photo.alt !== 'string' || !photo.alt.trim() || photo.alt.length > 500) throw new Error('Add a short accessibility description for every photo.');
      if (!Number.isInteger(photo.width) || !Number.isInteger(photo.height) || photo.width < 1 || photo.height < 1 || photo.width > 40000 || photo.height > 40000) throw new Error('Invalid image dimensions.');
      ['focalX','focalY'].forEach(function(key) { if (typeof photo[key] !== 'number' || !isFinite(photo[key]) || photo[key] < 0 || photo[key] > 100) throw new Error('Invalid photo position.'); });
      if (!Array.isArray(photo.variants) || !photo.variants.length || photo.variants.length > 4) throw new Error('Photo is not prepared yet.');
      var last = 0;
      photo.variants.forEach(function(v) {
        if (!/^assets\/(photos|photographer)\/[a-zA-Z0-9_-]+\.webp$/.test(v.src) || !Number.isInteger(v.width) || v.width <= last || v.width > 4000) throw new Error('Invalid prepared image.');
        last = v.width;
      });
      if (photo.label && (typeof photo.label !== 'string' || photo.label.length > 60)) throw new Error('Invalid slideshow label.');
    });
  });
  return manifest;
}
function photoVariant_(photo, width) { return photo.variants.find(function(v) { return v.width >= width; }) || photo.variants[photo.variants.length - 1]; }
function photoFull_(photo) { return photo.variants[photo.variants.length - 1].src; }
function photoImage_(photo, width, sizes, eager, position) {
  var variant = photoVariant_(photo, width);
  return '<img src="' + escapePhoto_(variant.src) + '" srcset="' + photo.variants.map(function(v) { return escapePhoto_(v.src) + ' ' + v.width + 'w'; }).join(', ') + '" sizes="' + escapePhoto_(sizes) + '" width="' + variant.width + '" height="' + Math.round(variant.width * photo.height / photo.width) + '" alt="' + escapePhoto_(photo.alt) + '"' + (position ? ' style="object-position:' + photo.focalX + '% ' + photo.focalY + '%"' : '') + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
}
function watermarkPhoto_() { return '<span class="photo-watermark" aria-hidden="true">Elementales</span>'; }
function photoCard_(photo, category, home) {
  var dataCategory = {weddings:'stories', maternity:'maternity', family:'family', 'dreamy-projects':'dreamy'}[category];
  return '<article class="work-card" data-category="' + dataCategory + '"><figure><a class="gallery-image-link" data-gallery-item href="' + photoFull_(photo) + '" aria-label="View photograph: ' + escapePhoto_(photo.alt) + '">' + photoImage_(photo, 960, home ? '(max-width:520px) 100vw, 50vw' : '(max-width:520px) 100vw, (max-width:800px) 50vw, 33vw', false, false) + watermarkPhoto_() + '<span class="gallery-enlarge" aria-hidden="true">View larger ↗</span></a></figure></article>';
}
function replacePhotoSlot_(html, name, contents) {
  var start = '<!-- photos:start ' + name + ' -->', end = '<!-- photos:end ' + name + ' -->';
  var a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < a || html.indexOf(start, a + 1) !== -1 || html.indexOf(end, b + 1) !== -1) throw new Error('Managed photo region missing: ' + name + '. Website was not changed.');
  return html.slice(0, a + start.length) + contents + html.slice(b);
}
function renderPhotoPage_(html, page, manifest) {
  validatePhotoManifest_(manifest);
  if (page === 'index.html') {
    var slides = manifest.categories.slideshow;
    html = html.replace(/<a\b[^>]*\bdata-slide-full\b[^>]*>/g, function(tag) { return tag.replace(/href="[^"]*"/, 'href="' + photoFull_(slides[0]) + '"').replace(/aria-label="[^"]*"/, 'aria-label="View full ' + escapePhoto_(slides[0].label || 'selected') + ' photograph"'); });
    html = html.replace(/(<[^>]+data-slide-caption[^>]*>)[^<]*/, function(_,tag) { return tag + escapePhoto_(slides[0].label || 'Selected photography') + ' · 1 / 5'; });
    html = replacePhotoSlot_(html, 'slideshow', slides.map(function(photo, i) {
      var label = photo.label || 'Selected photography';
      return '<figure class="hero-slide" data-hero-slide data-label="' + escapePhoto_(label) + '" data-full="' + photoFull_(photo) + '" role="group" aria-roledescription="slide" aria-label="' + (i+1) + ' of ' + slides.length + ': ' + escapePhoto_(label) + '"' + (i ? ' hidden' : '') + '>' + photoImage_(photo, 1600, '100vw', !i, true) + '</figure>';
    }).join(''));
    html = replacePhotoSlot_(html, 'home-gallery', '<div class="curated-gallery home-preview-gallery" data-gallery>' + PHOTO_CATEGORIES_.slice(0,4).map(function(category) {
      var all = manifest.categories[category], featured = (manifest.homeFeatured || {})[category] || [];
      var chosen = featured.map(function(key) { return all.find(function(p) { return p.key === key; }); }).filter(Boolean);
      all.forEach(function(p) { if (chosen.length < 4 && !chosen.includes(p)) chosen.push(p); });
      var cards = chosen.slice(0,4).map(function(p) { return photoCard_(p,category,true); });
      var dataCategory = {weddings:'stories',maternity:'maternity',family:'family','dreamy-projects':'dreamy'}[category];
      return '<div class="home-preview-pair" data-preview-category="' + dataCategory + '"><div class="home-preview-column">' + cards.slice(0,2).join('') + '</div><div class="home-preview-column">' + cards.slice(2,4).join('') + '</div></div>';
    }).join('') + '</div>');
  } else if (page !== 'about.html') {
    var category = page.replace('.html','');
    if (!PHOTO_CATEGORIES_.slice(0,4).includes(category)) throw new Error('Unsupported photo page.');
    html = replacePhotoSlot_(html, 'gallery:' + category, manifest.categories[category].map(function(p) { return photoCard_(p,category,false); }).join(''));
    html = replacePhotoSlot_(html, 'cover:' + category, '<figure class="collection-visual">' + photoImage_(manifest.categories[category][0],1600,'(max-width:760px) 100vw, 58vw',true,true) + watermarkPhoto_() + '</figure>');
  }
  if (page === 'index.html' || page === 'about.html') {
    html = replacePhotoSlot_(html, 'portrait', '<figure class="photographer-portrait">' + photoImage_(manifest.categories.about[0],800,'(max-width:760px) 90vw, 32vw',page === 'about.html',true) + watermarkPhoto_() + '</figure>');
  }
  return html;
}
