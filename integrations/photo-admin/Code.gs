/** Elementales private photo administration. Deploy separately from public reviews. */
var PHOTO_OWNER_ = 'elementalesbysony@gmail.com';
var PHOTO_REPO_ = 'shwetamahendrakar25/elementales';
var PHOTO_SITE_ = 'https://elementales.biz/';
var PHOTO_STATE_PROPERTY_ = 'PHOTO_ADMIN_STATE_FILE';
var PHOTO_MAX_BYTES_ = 25 * 1024 * 1024;

function requirePhotoOwner_() {
  // USER_ACCESSING + Google's MYSELF access gate, with an independent identity check.
  var email = Session.getActiveUser().getEmail().toLowerCase();
  if (email !== PHOTO_OWNER_) throw new Error('Sign in with the Elementales owner account to manage photos.');
}
function doGet() {
  requirePhotoOwner_();
  return HtmlService.createHtmlOutputFromFile('Admin').setTitle('Elementales — Photo Studio');
}
function photoLock_(fn) {
  requirePhotoOwner_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Another photo operation is running. Please try again shortly.');
  try { return fn(); } finally { lock.releaseLock(); }
}
function photoProperties_() { return PropertiesService.getScriptProperties(); }
function readPhotoJson_(id) { return JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString()); }
function writePhotoJson_(id, value) { DriveApp.getFileById(id).setContent(JSON.stringify(value)); }
function statePhoto_() {
  var id = photoProperties_().getProperty(PHOTO_STATE_PROPERTY_);
  if (!id) return null;
  var state = readPhotoJson_(id);
  state.stateFile = id;
  return state;
}
function savePhotoState_(state) { writePhotoJson_(state.stateFile, state); }
function createPhotoJson_(folder, name, value) { return folder.createFile(name, JSON.stringify(value), MimeType.PLAIN_TEXT).getId(); }
function newPhotoId_() { return Utilities.getUuid().replace(/-/g,''); }
function photoGit_(method, path, data) {
  var token = photoProperties_().getProperty('GITHUB_PHOTO_TOKEN');
  if (method !== 'get' && !token) throw new Error('Connect GitHub publishing in Settings first.');
  var headers = {'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'};
  if (token) headers.Authorization = 'Bearer ' + token;
  var options = {method:method, headers:headers, muteHttpExceptions:true, followRedirects:false};
  if (data) { options.contentType = 'application/json'; options.payload = JSON.stringify(data); }
  var response = UrlFetchApp.fetch('https://api.github.com/repos/' + PHOTO_REPO_ + (path ? '/' + path : ''), options);
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    // Do not echo response bodies, source IDs, tokens, or request payloads into the browser/log.
    throw new Error('GitHub could not complete this operation (' + code + '). Check publishing access and try again. The existing website is preserved.');
  }
  return JSON.parse(response.getContentText());
}
function photoHead_() { return photoGit_('get','git/ref/heads/main').object.sha; }
function photoGitText_(path, ref) {
  var file = photoGit_('get','contents/' + path + '?ref=' + encodeURIComponent(ref));
  if (file.encoding !== 'base64') throw new Error('Could not read website source.');
  return Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\s/g,''))).getDataAsString();
}
function photoGitManifest_(ref) { return validatePhotoManifest_(JSON.parse(photoGitText_('gallery-manifest.json',ref))); }
function publicPhotoState_(state) {
  if (!state) return {initialized:false, connected:!!photoProperties_().getProperty('GITHUB_PHOTO_TOKEN'), labels:PHOTO_LABELS_};
  return {initialized:true, connected:!!photoProperties_().getProperty('GITHUB_PHOTO_TOKEN'), rootUrl:DriveApp.getFolderById(state.root).getUrl(),
    folders:PHOTO_CATEGORIES_.map(function(category) { return {category:category,name:PHOTO_LABELS_[category],url:DriveApp.getFolderById(state.folders[category]).getUrl()}; }),
    seedDone:state.seedDone, seedTotal:state.seed.length, seedCompleted:state.seed.filter(function(item) { return !!item.file; }).length,
    history:state.history.map(function(v) { return {id:v.id,created:v.created,label:v.label,commit:v.commit,restoredFrom:v.restoredFrom || null}; }),
    draft:state.draft || null, publication:state.publication || null, labels:PHOTO_LABELS_, liveVersion:state.liveVersion};
}
function getPhotoAdminState() { requirePhotoOwner_(); return publicPhotoState_(statePhoto_()); }
function initializePhotoAdmin() {
  return photoLock_(function() {
    var current = statePhoto_();
    if (current) return publicPhotoState_(current);
    var head = photoHead_(), baseline = photoGitManifest_(head);
    var root = DriveApp.createFolder('Elementales Website Photos');
    var system = root.createFolder('_System — saved versions and previews');
    var state = {schema:1, root:root.getId(), system:system.getId(), folders:{}, seed:[], seedDone:false, bindings:{}, history:[], liveVersion:baseline.version};
    PHOTO_CATEGORIES_.forEach(function(category) {
      state.folders[category] = root.createFolder(PHOTO_LABELS_[category]).getId();
      baseline.categories[category].forEach(function(photo,i) { state.seed.push({category:category,index:i,photo:photo}); });
    });
    var versionFile = createPhotoJson_(system,'version-initial-portfolio.json',{manifest:baseline,bindings:{}});
    state.history.push({id:baseline.version,created:new Date().toISOString(),label:'Original website selection',commit:head,file:versionFile});
    state.stateFile = createPhotoJson_(system,'photo-admin-state.json',state);
    photoProperties_().setProperty(PHOTO_STATE_PROPERTY_,state.stateFile);
    savePhotoState_(state);
    return publicPhotoState_(state);
  });
}
function seedPhotoFolders() {
  return photoLock_(function() {
    var state = statePhoto_();
    if (!state) throw new Error('Create the photo folders first.');
    if (state.seedDone) return publicPhotoState_(state);
    var original = state.history[0].commit;
    state.seed.filter(function(item) { return !item.file; }).slice(0,4).forEach(function(item) {
      var name = String(item.index + 1).padStart(3,'0') + ' ' + item.photo.key + '.webp';
      var folder = DriveApp.getFolderById(state.folders[item.category]);
      var matching = folder.getFilesByName(name), file;
      if (matching.hasNext()) file = matching.next();
      else {
        var response = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + PHOTO_REPO_ + '/' + original + '/' + photoFull_(item.photo),{muteHttpExceptions:true,followRedirects:false});
        if (response.getResponseCode() !== 200) throw new Error('Could not copy an existing website photo. Retry setup; the original website is unchanged.');
        file = folder.createFile(response.getBlob().setName(name).setContentType('image/webp'));
      }
      item.file = file.getId();
      state.bindings[item.file] = {category:item.category,photo:item.photo,fingerprint:photoFingerprint_(file)};
      savePhotoState_(state); // Resume safely after interruption; never duplicate a seeded photo.
    });
    state.seedDone = state.seed.every(function(item) { return !!item.file; });
    if (state.seedDone) {
      var initial = readPhotoJson_(state.history[0].file);
      initial.bindings = state.bindings;
      writePhotoJson_(state.history[0].file,initial);
    }
    savePhotoState_(state);
    return publicPhotoState_(state);
  });
}
function photoFingerprint_(file) { return file.getLastUpdated().getTime() + ':' + file.getSize(); }
function listPhotoSources_(state) {
  var sources = {};
  PHOTO_CATEGORIES_.forEach(function(category) {
    var folder = DriveApp.getFolderById(state.folders[category]);
    if (folder.isTrashed()) throw new Error(PHOTO_LABELS_[category] + ' folder is in Trash. Restore it before syncing.');
    var files = folder.getFiles(), items = [];
    while (files.hasNext()) {
      var file = files.next();
      if (file.isTrashed()) continue;
      var mime = file.getMimeType();
      if (!['image/jpeg','image/png','image/webp'].includes(mime)) throw new Error(PHOTO_LABELS_[category] + ': only JPG, PNG, and WebP photos are supported. Remove or convert ' + file.getName() + '.');
      if (file.getSize() > PHOTO_MAX_BYTES_) throw new Error('A photo exceeds 25 MB. Resize it before syncing: ' + file.getName());
      items.push({id:file.getId(),name:file.getName(),mime:mime,fingerprint:photoFingerprint_(file)});
      if (items.length > 100) throw new Error('Limit each category to 100 selected photos.');
    }
    // Fail closed: no folder-access exception becomes an empty gallery.
    if (!items.length) throw new Error(PHOTO_LABELS_[category] + ' is empty. Add photos or restore its contents before syncing.');
    if (category === 'slideshow' && items.length !== 5) throw new Error('Homepage Slideshow must contain exactly five photos.');
    if (category === 'about' && items.length !== 1) throw new Error('About must contain exactly one portrait.');
    sources[category] = items.sort(function(a,b) { return a.name.localeCompare(b.name,undefined,{numeric:true}) || a.id.localeCompare(b.id); });
  });
  return sources;
}
function syncPhotoDraft() {
  return photoLock_(function() {
    var state = statePhoto_();
    if (!state || !state.seedDone) throw new Error('Finish copying the original selection before syncing.');
    if (state.publication) throw new Error('Finish or cancel the current publication first.');
    var head = photoHead_(), live = photoGitManifest_(head), sources = listPhotoSources_(state);
    var id = newPhotoId_(), folder = DriveApp.getFolderById(state.system).createFolder('Preview ' + id);
    var draft = {id:id,baseHead:head,created:new Date().toISOString(),manifest:JSON.parse(JSON.stringify(live)),items:{},folder:folder.getId(),revision:0};
    draft.manifest.version = id;
    PHOTO_CATEGORIES_.forEach(function(category) {
      draft.manifest.categories[category] = sources[category].map(function(source) {
        var binding = state.bindings[source.id], unchanged = binding && binding.fingerprint === source.fingerprint;
        var photo = unchanged ? JSON.parse(JSON.stringify(binding.photo)) : {key:'p-' + newPhotoId_(),alt:PHOTO_LABELS_[category] + ' photograph',width:1,height:1,variants:[],focalX:50,focalY:20};
        if (draft.items[photo.key]) photo.key = 'p-' + newPhotoId_();
        draft.items[photo.key] = {source:source,category:category,prepared:!!unchanged,photo:photo};
        return photo;
      });
    });
    var file = createPhotoJson_(folder,'draft.json',draft);
    state.draft = {id:id,file:file,folder:folder.getId()};
    savePhotoState_(state);
    return getPhotoDraft_();
  });
}
function getPhotoDraft_() {
  var state = statePhoto_();
  if (!state || !state.draft) return null;
  var draft = readPhotoJson_(state.draft.file), live = photoGitManifest_(draft.baseHead);
  var changes = PHOTO_CATEGORIES_.map(function(category) {
    var before = live.categories[category], after = draft.manifest.categories[category];
    var oldKeys = before.map(function(p) { return p.key; }), newKeys = after.map(function(p) { return p.key; });
    return {category:category,added:after.filter(function(p) { return !oldKeys.includes(p.key); }).length,removed:before.filter(function(p) { return !newKeys.includes(p.key); }).length,total:after.length,reordered:oldKeys.filter(function(k) { return newKeys.includes(k); }).join() !== newKeys.filter(function(k) { return oldKeys.includes(k); }).join()};
  });
  return {id:draft.id,revision:draft.revision,baseHead:draft.baseHead,manifest:draft.manifest,changes:changes,
    items:Object.keys(draft.items).map(function(key) { var item = draft.items[key]; return {key:key,category:item.category,name:item.source.name,prepared:item.prepared,previewed:!!item.previewed}; }),
    ready:Object.keys(draft.items).every(function(key) { return draft.items[key].prepared; })};
}
function getPhotoDraft() { requirePhotoOwner_(); return getPhotoDraft_(); }
function loadPhotoDraft_(id) {
  var state = statePhoto_();
  if (!state || !state.draft || state.draft.id !== id) throw new Error('This preview is no longer current. Sync again.');
  return {state:state,draft:readPhotoJson_(state.draft.file)};
}
function getPhotoSource(id, key) {
  return photoLock_(function() {
    var context = loadPhotoDraft_(id), draft = context.draft, item = draft.items[key];
    if (!item || item.prepared) throw new Error('Photo does not need preparation.');
    if (!item.snapshot) {
      var file = DriveApp.getFileById(item.source.id);
      if (file.isTrashed() || photoFingerprint_(file) !== item.source.fingerprint) throw new Error('A source photo changed during sync. Start Sync & Preview again.');
      item.snapshot = file.makeCopy('source-' + key,DriveApp.getFolderById(draft.folder)).getId();
      writePhotoJson_(context.state.draft.file,draft);
    }
    var snapshot = DriveApp.getFileById(item.snapshot).getBlob();
    if (snapshot.getBytes().length > PHOTO_MAX_BYTES_) throw new Error('Photo exceeds 25 MB.');
    return {mime:item.source.mime,data:Utilities.base64Encode(snapshot.getBytes())};
  });
}
function savePreparedPhoto(id, key, variants, dimensions) {
  return photoLock_(function() {
    var context = loadPhotoDraft_(id), draft = context.draft, item = draft.items[key];
    if (!item || !item.snapshot || item.prepared) throw new Error('Photo preparation is no longer available.');
    if (!dimensions || !Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) || dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 40000 || dimensions.height > 40000) throw new Error('Invalid source dimensions.');
    var expected = [480,960,1600,2048].filter(function(w) { return w < dimensions.width; });
    expected.push(Math.min(2048,dimensions.width));
    if (!Array.isArray(variants) || variants.length !== expected.length) throw new Error('Incomplete prepared photo.');
    var prepared = [], privateFiles = {};
    variants.forEach(function(v,i) {
      if (v.width !== expected[i] || typeof v.data !== 'string' || v.data.length > 8 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(v.data)) throw new Error('Invalid prepared photo.');
      var bytes = Utilities.base64Decode(v.data);
      var magic = Utilities.newBlob(bytes.slice(0,12)).getDataAsString();
      if (magic.slice(0,4) !== 'RIFF' || magic.slice(8,12) !== 'WEBP') throw new Error('Prepared photos must be WebP images.');
      var path = 'assets/photos/' + key + '-' + v.width + '.webp';
      privateFiles[path] = DriveApp.getFolderById(draft.folder).createFile(Utilities.newBlob(bytes,'image/webp',key + '-' + v.width + '.webp')).getId();
      prepared.push({src:path,width:v.width});
    });
    item.photo.width = dimensions.width; item.photo.height = dimensions.height; item.photo.variants = prepared;
    item.files = privateFiles; item.prepared = true;
    draft.manifest.categories[item.category] = draft.manifest.categories[item.category].map(function(p) { return p.key === key ? item.photo : p; });
    draft.revision++; delete draft.reviewedRevision;
    writePhotoJson_(context.state.draft.file,draft);
    return {prepared:true};
  });
}
function savePhotoEdits(id, revision, edits) {
  return photoLock_(function() {
    var context = loadPhotoDraft_(id), draft = context.draft;
    if (context.state.publication) throw new Error('Publication has started; cancel it before editing.');
    if (revision !== draft.revision) throw new Error('The preview changed in another window. Reload it before editing.');
    if (!edits || !edits.categories) throw new Error('Invalid photo edits.');
    PHOTO_CATEGORIES_.forEach(function(category) {
      var old = draft.manifest.categories[category], requested = edits.categories[category];
      if (!Array.isArray(requested) || requested.length !== old.length || new Set(requested.map(function(p) { return p.key; })).size !== old.length) throw new Error('Sync again to add or remove photos.');
      draft.manifest.categories[category] = requested.map(function(p) {
        var existing = old.find(function(item) { return item.key === p.key; });
        if (!existing) throw new Error('Unknown photo.');
        return Object.assign({}, existing,{alt:p.alt,focalX:p.focalX,focalY:p.focalY});
      });
    });
    validatePhotoManifest_(draft.manifest);
    draft.revision++; delete draft.reviewedRevision;
    writePhotoJson_(context.state.draft.file,draft);
    return getPhotoDraft_();
  });
}
function getPhotoPreview(id, page) {
  return photoLock_(function() {
    if (!PHOTO_PAGES_.includes(page)) throw new Error('Unsupported preview page.');
    var context = loadPhotoDraft_(id), draft = context.draft;
    var html = renderPhotoPage_(photoGitText_(page,draft.baseHead),page,draft.manifest);
    html = html.replace('<head>','<head><base href="' + PHOTO_SITE_ + '">');
    // Private draft photos are embedded; the source folder and snapshots never become public.
    Object.keys(draft.items).forEach(function(key) {
      var item = draft.items[key];
      Object.keys(item.files || {}).forEach(function(path) {
        if (!html.includes(path)) return;
        var bytes = DriveApp.getFileById(item.files[path]).getBlob().getBytes();
        html = html.split(path).join('data:image/webp;base64,' + Utilities.base64Encode(bytes));
      });
    });
    draft.reviewedRevision = draft.revision;
    writePhotoJson_(context.state.draft.file,draft);
    return {html:html,revision:draft.revision};
  });
}
function getPhotoThumbnail(id, key) {
  requirePhotoOwner_();
  var context = loadPhotoDraft_(id), item = context.draft.items[key];
  if (!item || !item.prepared) throw new Error('Prepare this photo first.');
  var path = photoVariant_(item.photo,480).src;
  if (item.files && item.files[path]) return 'data:image/webp;base64,' + Utilities.base64Encode(DriveApp.getFileById(item.files[path]).getBlob().getBytes());
  return 'https://raw.githubusercontent.com/' + PHOTO_REPO_ + '/' + context.draft.baseHead + '/' + path;
}
function connectPhotoPublishing(token) {
  return photoLock_(function() {
    if (typeof token !== 'string' || !/^github_pat_[A-Za-z0-9_]{20,250}$/.test(token)) throw new Error('Use a fine-grained GitHub token restricted to the Elementales repository.');
    var previous = photoProperties_().getProperty('GITHUB_PHOTO_TOKEN');
    photoProperties_().setProperty('GITHUB_PHOTO_TOKEN',token);
    try {
      var repository = photoGit_('get','');
      if (!repository.permissions || !repository.permissions.push) throw new Error('This token cannot publish to the Elementales repository.');
    } catch (error) {
      if (previous) photoProperties_().setProperty('GITHUB_PHOTO_TOKEN',previous); else photoProperties_().deleteProperty('GITHUB_PHOTO_TOKEN');
      throw error;
    }
    return {connected:true};
  });
}
function beginPhotoPublication(id, revision, confirmation) {
  return photoLock_(function() {
    var context = loadPhotoDraft_(id), state = context.state, draft = context.draft;
    if (state.publication) {
      if (state.publication.draft !== id) throw new Error('Another publication is in progress.');
      return publicationPhotoProgress_(state);
    }
    if (confirmation !== 'PUBLISH') throw new Error('Confirm the reviewed photo selection before publishing.');
    if (!photoProperties_().getProperty('GITHUB_PHOTO_TOKEN')) throw new Error('Connect GitHub publishing first.');
    if (revision !== draft.revision || draft.reviewedRevision !== revision) throw new Error('Open the latest website preview before publishing.');
    if (!Object.keys(draft.items).every(function(key) { return draft.items[key].prepared; })) throw new Error('Prepare every photo first.');
    validatePhotoManifest_(draft.manifest);
    if (photoHead_() !== draft.baseHead) throw new Error('The website changed since this preview. Sync and review again before publishing.');
    state.publication = {id:newPhotoId_(),draft:id,revision:revision,baseHead:draft.baseHead,blobs:{},created:new Date().toISOString()};
    savePhotoState_(state);
    return publicationPhotoProgress_(state);
  });
}
function publicationPhotoProgress_(state) {
  var draft = readPhotoJson_(state.draft.file), pending = [];
  Object.keys(draft.items).forEach(function(key) {
    Object.keys(draft.items[key].files || {}).forEach(function(path) { if (!state.publication.blobs[path]) pending.push({key:key,path:path}); });
  });
  return {id:state.publication.id,pending:pending.length,ready:!pending.length,commit:state.publication.commit || null};
}
function uploadPhotoPublication(id) {
  return photoLock_(function() {
    var state = statePhoto_();
    if (!state || !state.publication || state.publication.id !== id) throw new Error('Publication is no longer current.');
    if (state.publication.commit) return publicationPhotoProgress_(state);
    var draft = readPhotoJson_(state.draft.file), paths = [];
    Object.keys(draft.items).forEach(function(key) {
      Object.keys(draft.items[key].files || {}).forEach(function(path) { if (!state.publication.blobs[path]) paths.push({file:draft.items[key].files[path],path:path}); });
    });
    paths.slice(0,2).forEach(function(item) {
      var bytes = DriveApp.getFileById(item.file).getBlob().getBytes();
      var blob = photoGit_('post','git/blobs',{content:Utilities.base64Encode(bytes),encoding:'base64'});
      state.publication.blobs[item.path] = blob.sha;
      savePhotoState_(state);
    });
    return publicationPhotoProgress_(state);
  });
}
function finalizePhotoPublication(id) {
  return photoLock_(function() {
    var state = statePhoto_();
    if (!state || !state.publication || state.publication.id !== id) throw new Error('Publication is no longer current.');
    var job = state.publication, draft = readPhotoJson_(state.draft.file);
    if (!publicationPhotoProgress_(state).ready) throw new Error('Photo upload is still in progress.');
    if (draft.revision !== job.revision) throw new Error('The draft changed. Cancel this publication and preview again.');
    // Preserve the saved job before touching main. Retrying an interrupted operation is idempotent.
    if (!job.commit) {
      if (photoHead_() !== job.baseHead) throw new Error('The website changed. Cancel publication, sync, and review again.');
      var parent = photoGit_('get','git/commits/' + job.baseHead), entries = [];
      PHOTO_PAGES_.forEach(function(page) { entries.push({path:page,mode:'100644',type:'blob',content:renderPhotoPage_(photoGitText_(page,job.baseHead),page,draft.manifest)}); });
      entries.push({path:'gallery-manifest.json',mode:'100644',type:'blob',content:JSON.stringify(draft.manifest,null,2) + '\n'});
      Object.keys(job.blobs).forEach(function(path) { entries.push({path:path,mode:'100644',type:'blob',sha:job.blobs[path]}); });
      var tree = photoGit_('post','git/trees',{base_tree:parent.tree.sha,tree:entries});
      job.commit = photoGit_('post','git/commits',{message:'Publish photo selection ' + draft.id,tree:tree.sha,parents:[job.baseHead]}).sha;
      savePhotoState_(state);
    }
    var current = photoHead_();
    if (current !== job.commit) {
      if (current !== job.baseHead) throw new Error('The website changed. Cancel this publication and sync again.');
      photoGit_('patch','git/refs/heads/main',{sha:job.commit,force:false});
    }
    var bindings = {};
    Object.keys(draft.items).forEach(function(key) {
      var item = draft.items[key], photo = draft.manifest.categories[item.category].find(function(p) { return p.key === key; });
      bindings[item.source.id] = {category:item.category,photo:photo,fingerprint:item.source.fingerprint};
    });
    var versionFile = createPhotoJson_(DriveApp.getFolderById(state.system),'version-' + draft.id + '.json',{manifest:draft.manifest,bindings:bindings});
    if (!state.history.some(function(v) { return v.id === draft.id; })) state.history.unshift({id:draft.id,created:new Date().toISOString(),label:draft.restoredFrom ? 'Restored photo selection' : 'Published photo selection',restoredFrom:draft.restoredFrom || null,commit:job.commit,file:versionFile});
    state.bindings = bindings; state.liveVersion = draft.id;
    state.lastPublication = {commit:job.commit,version:draft.id};
    state.publication = null; state.draft = null;
    savePhotoState_(state);
    return {commit:job.commit,version:draft.id,status:'deploying',url:PHOTO_SITE_};
  });
}
function cancelPhotoPublication() {
  return photoLock_(function() {
    var state = statePhoto_();
    if (state && state.publication) {
      if (state.publication.commit && photoHead_() === state.publication.commit) throw new Error('This version has already been submitted. Resume publication to finish recording it.');
      state.publication = null; savePhotoState_(state);
    }
    return publicPhotoState_(state);
  });
}
function preparePhotoRestore(versionId) {
  return photoLock_(function() {
    var state = statePhoto_();
    if (!state || state.publication) throw new Error('Finish the current publication before restoring.');
    var version = state.history.find(function(v) { return v.id === versionId; });
    if (!version) throw new Error('Saved version not found.');
    var saved = readPhotoJson_(version.file), head = photoHead_(), id = newPhotoId_();
    var draft = {id:id,created:new Date().toISOString(),revision:0,baseHead:head,manifest:saved.manifest,items:{},restoredFrom:versionId};
    draft.manifest.version = id;
    PHOTO_CATEGORIES_.forEach(function(category) {
      draft.manifest.categories[category].forEach(function(photo) {
        var sourceId = Object.keys(saved.bindings).find(function(source) { return saved.bindings[source].category === category && saved.bindings[source].photo.key === photo.key; });
        draft.items[photo.key] = {source:{id:sourceId || 'archived-' + category + '-' + photo.key,name:photo.alt,fingerprint:sourceId ? saved.bindings[sourceId].fingerprint : 'archived'},category:category,photo:photo,prepared:true};
      });
    });
    draft.folder = DriveApp.getFolderById(state.system).createFolder('Restore preview ' + id).getId();
    state.draft = {id:id,folder:draft.folder,file:createPhotoJson_(DriveApp.getFolderById(draft.folder),'draft.json',draft)};
    savePhotoState_(state);
    return getPhotoDraft_();
  });
}
function getPhotoDeployment() {
  requirePhotoOwner_();
  var state = statePhoto_();
  if (!state || !state.lastPublication) return null;
  var commit = state.lastPublication.commit;
  var builds = photoGit_('get','actions/runs?head_sha=' + commit + '&per_page=10').workflow_runs || [];
  var pages = builds.filter(function(run) { return /pages/i.test(run.name); }).sort(function(a,b) { return b.id-a.id; })[0];
  return {commit:commit,status:pages ? pages.status : 'queued',conclusion:pages ? pages.conclusion : null,url:PHOTO_SITE_};
}
