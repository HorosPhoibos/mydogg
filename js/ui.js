// Antarmuka: pilih tokoh, panel tingkah dan baju, mode Elus, dialog foto asli.

import { BREEDS, PHOTO_LOOKS } from './dog/breeds.js';
import { PEOPLE } from './people/people.js';

const ACTIONS = [
  { id: 'walk', label: 'Jalan' },
  { id: 'sit', label: 'Duduk' },
  { id: 'sploot', label: 'Kaki kodok' },
  { id: 'bow', label: 'Ajak main' },
  { id: 'beg', label: 'Joget 2 kaki' },
  { id: 'shake', label: 'Salim' },
  { id: 'roll', label: 'Guling' },
  { id: 'jump', label: 'Lompat putar' },
  { id: 'sleep', label: 'Tidur' },
];

const FACES = [
  { id: 'tilt', label: 'Miring' },
  { id: 'wink', label: 'Kedip' },
  { id: 'yawn', label: 'Menguap' },
  { id: 'no', label: 'Geleng' },
];

const VOICE_MESSAGES = {
  listening: (name) => `${name} mendengarkan. Coba bicara sekarang.`,
  silent: (name) => `${name} tidak mendengar apa-apa. Tekan Bicara lalu coba lagi.`,
  denied: () => 'Mikrofon belum diizinkan. Izinkan lewat pengaturan browser, lalu coba lagi.',
  unsupported: () => 'Browser ini belum bisa merekam suara. Coba Chrome atau Safari terbaru.',
  error: () => 'Rekaman tidak bisa diputar. Coba lagi.',
};

const $ = (selector, root = document) => root.querySelector(selector);

function chip(label, onClick, extra = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.textContent = label;
  button.addEventListener('click', onClick);
  Object.assign(button.dataset, extra);
  return button;
}

export function createUI(app) {
  const panel = $('#panel');
  const toast = $('#toast');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrow = () => matchMedia('(max-width: 760px)').matches;
  let toastTimer = 0;

  // Pilih tokoh
  const dogBar = $('#dogs');
  [...BREEDS, ...PEOPLE].forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dog-tab';
    button.dataset.actor = item.id;
    button.innerHTML = `<img src="${item.photo ?? ''}" alt="" width="56" height="56"><span>${item.name}</span>`;
    button.addEventListener('click', () => {
      app.select(item.id);
      if (!isNarrow()) openPanel(true);
    });
    dogBar.appendChild(button);
  });

  // Suasana
  const themeBar = $('#themes');
  Object.entries(app.themes).forEach(([id, theme]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'seg';
    button.textContent = theme.label;
    button.dataset.scene = id;
    button.setAttribute('aria-pressed', String(id === 'room'));
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      themeBar.querySelectorAll('.seg').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      // Layar menutup sebentar, supaya perpindahan tempat tidak terlihat meloncat.
      const fade = $('#fade');
      fade.classList.add('is-on');
      setTimeout(() => {
        app.setTheme(id);
        setTimeout(() => fade.classList.remove('is-on'), 80);
      }, 280);
    });
    themeBar.appendChild(button);
  });

  // Tingkah
  const actionGrid = $('#actions');
  ACTIONS.forEach((action) => {
    actionGrid.appendChild(
      chip(action.label, () => {
        app.command(action.id);
        markAction(action.id);
      }, { action: action.id }),
    );
  });
  let shownPose = '';
  const markAction = (id) => {
    shownPose = id;
    actionGrid.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.action === id)));
  };
  const faceGrid = $('#faces');
  FACES.forEach((face) => faceGrid.appendChild(chip(face.label, () => app.express(face.id))));

  // Baju: isi lemari digambar ulang sesuai tokoh yang dipilih.
  const wearPane = $('#pane-wear');
  let wearOwner = null;
  const syncWardrobe = () => {
    const { wardrobe } = app.active;
    wearPane.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.item === wardrobe.state[b.dataset.slot])));
  };
  const renderWardrobe = () => {
    const { wardrobe } = app.active;
    if (wearOwner === wardrobe) {
      syncWardrobe();
      return;
    }
    wearOwner = wardrobe;
    wearPane.replaceChildren();
    wardrobe.catalog.forEach(({ slot, title, items }, index) => {
      const heading = document.createElement('h3');
      heading.textContent = title;
      if (index === 0) heading.className = 'first';
      const group = document.createElement('div');
      group.className = 'chips';
      items.forEach((item) => {
        group.appendChild(
          chip(item.label, () => {
            app.wear(slot, item.id);
            syncWardrobe();
          }, { item: item.id, slot }),
        );
      });
      wearPane.append(heading, group);
    });
    syncWardrobe();
  };

  // Perintah Mama dan Bapak ke anjing
  const orderDogs = $('#order-dogs');
  let orderTarget = 'all';
  const markOrder = () => orderDogs.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dog === orderTarget)));
  [{ id: 'all', name: 'Semua' }, ...BREEDS].forEach((item) => {
    orderDogs.appendChild(
      chip(item.name, () => {
        orderTarget = item.id;
        markOrder();
      }, { dog: item.id }),
    );
  });
  markOrder();
  panel.querySelectorAll('[data-order]').forEach((button) => {
    button.addEventListener('click', () => app.order(orderTarget, button.dataset.order));
  });

  // Tab panel
  const tabs = panel.querySelectorAll('[role="tab"]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        $(`#${t.getAttribute('aria-controls')}`).hidden = !selected;
      });
    });
  });

  // Tindakan anjing
  $('#do-pet').addEventListener('click', () => app.enterPet());
  $('#do-ball').addEventListener('click', () => app.throwBall());
  $('#do-treat').addEventListener('click', () => {
    app.feed();
    say(`${app.active.name} makan camilan.`);
  });
  $('#do-bark').addEventListener('click', () => app.bark());
  $('#do-talk').addEventListener('click', () => app.talk());

  // Tindakan Mama dan Bapak
  panel.querySelectorAll('[data-person-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.personAction === 'signature' ? app.active.data.signature : button.dataset.personAction;
      app.personAction(id);
    });
  });

  // Mode Elus
  $('#pet-done').addEventListener('click', () => app.leavePet());

  // Foto keluarga dan pesta
  $('#do-photo').addEventListener('click', () => app.takePhoto());
  $('#do-party').addEventListener('click', () => app.party());
  const result = $('#result');
  let resultBlob = null;
  $('#close-result').addEventListener('click', () => result.close());
  result.addEventListener('close', () => app.endPhoto());
  $('#result-again').addEventListener('click', () => {
    result.close();
    setTimeout(() => app.takePhoto(), 60);
  });
  const share = $('#result-share');
  share.addEventListener('click', async () => {
    const file = new File([resultBlob], 'foto-keluarga-mydogg.png', { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: 'Foto keluarga MYDOGG' });
    } catch {
      // Pengguna membatalkan, tidak perlu pesan apa pun.
    }
  });

  // Suara dan obrolan
  $('#music').addEventListener('change', (e) => app.setMusic(e.target.checked));
  $('#sound').addEventListener('change', (e) => app.setSound(e.target.checked));
  $('#chat').addEventListener('change', (e) => app.setChat(e.target.checked));

  // Pengaturan
  const roaming = $('#roaming');
  roaming.addEventListener('change', () => app.setRoaming(roaming.checked));
  const closeUp = $('#closeup');
  closeUp.addEventListener('change', () => app.setCloseUp(closeUp.checked));

  // Buka tutup panel
  const toggle = $('#panel-toggle');
  function measureInset() {
    const open = !panel.classList.contains('is-closed');
    const dock = $('#dock');
    if (document.body.classList.contains('is-petting')) {
      app.setPanelInset(0, isNarrow() ? 90 : 0);
      return;
    }
    if (document.body.classList.contains('is-shooting') || document.body.classList.contains('is-partying')) {
      app.setPanelInset(0, 0);
      return;
    }
    if (isNarrow()) {
      // Di HP, pilihan tokoh selalu berada tepat di atas panel supaya tidak tertutup.
      const panelTop = panel.getBoundingClientRect().top;
      dock.style.bottom = `${innerHeight - panelTop + 8}px`;
      const headerRoom = 96;
      app.setPanelInset(0, Math.max(0, innerHeight - dock.getBoundingClientRect().top - headerRoom));
    } else {
      dock.style.bottom = '';
      app.setPanelInset(open ? panel.offsetWidth + 32 : 0, 0);
    }
  }
  function openPanel(open) {
    panel.classList.toggle('is-closed', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Tutup' : 'Buka';
    measureInset();
  }
  toggle.addEventListener('click', () => openPanel(panel.classList.contains('is-closed')));
  const watcher = new ResizeObserver(measureInset);
  watcher.observe(document.body);
  watcher.observe(panel);

  // Foto asli
  const dialog = $('#photos');
  $('#open-photos').addEventListener('click', () => dialog.showModal());
  $('#close-photos').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll('[data-look]').forEach((button) => {
    button.addEventListener('click', () => {
      app.applyLook(button.dataset.look);
      renderWardrobe();
      dialog.close();
      say(`${PHOTO_LOOKS[button.dataset.look].label} dipakai.`);
    });
  });

  function say(message, hold = 3200) {
    toast.textContent = message;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    if (hold) toastTimer = setTimeout(() => toast.classList.remove('is-on'), hold);
  }

  // Panel mulai tertutup di layar kecil supaya tokohnya kelihatan dulu.
  if (isNarrow()) openPanel(false);
  else measureInset();

  const hearts = [...$('#pet-hearts').children];

  return {
    say,
    ready() {
      const go = $('#intro-go');
      go.disabled = false;
      go.textContent = 'Masuk ke rumah';
      go.addEventListener('click', () => {
        $('#intro').classList.add('is-gone');
        setTimeout(() => $('#intro').remove(), 700);
        app.enter();
      }, { once: true });
    },
    skipIntro() {
      $('#intro').remove();
    },
    setShooting(on) {
      document.body.classList.toggle('is-shooting', on);
      measureInset();
    },
    setPartying(on) {
      document.body.classList.toggle('is-partying', on);
      measureInset();
    },
    countdown(value) {
      $('#countdown').textContent = value;
    },
    flash() {
      const flash = $('#flash');
      flash.classList.remove('is-on');
      void flash.offsetWidth;
      flash.classList.add('is-on');
    },
    showPhoto(canvas) {
      canvas.toBlob((blob) => {
        resultBlob = blob;
        const url = URL.createObjectURL(blob);
        $('#result-img').src = url;
        $('#result-save').href = url;
        const file = new File([blob], 'foto-keluarga-mydogg.png', { type: 'image/png' });
        share.hidden = !navigator.canShare?.({ files: [file] });
        result.showModal();
      }, 'image/png');
    },
    showActor(actor) {
      const isDog = actor.isDog;
      $('#dog-name').textContent = actor.name;
      $('#dog-breed').textContent = isDog ? actor.breed.breed : actor.data.role;
      $('#dog-about').textContent = isDog ? actor.breed.about : actor.data.about;
      panel.dataset.kind = isDog ? 'dog' : 'person';
      dogBar.querySelectorAll('.dog-tab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.actor === actor.id)));
      renderWardrobe();
      if (isDog) {
        markAction(actor.poseName);
      } else {
        $('#person-signature').textContent = actor.data.signatureLabel;
        $('#person-self').textContent = `${actor.name} sendiri`;
      }
    },
    syncPose(name) {
      if (name !== shownPose) markAction(name);
    },
    syncRoaming(value) {
      roaming.checked = value;
    },
    setAvatar(id, url) {
      const img = dogBar.querySelector(`[data-actor="${id}"] img`);
      img.src = url;
      img.classList.add('is-knit');
    },
    setPetMode(dog) {
      document.body.classList.toggle('is-petting', Boolean(dog));
      if (dog) {
        $('#pet-name').textContent = `Elus ${dog.name}`;
        hearts.forEach((h) => h.classList.remove('is-full'));
        say('Gosok untuk mengelus. Matanya mengikuti kursor. Awas, jangan pencet hidungnya 3 kali.', 6000);
      } else {
        toast.classList.remove('is-on');
      }
      measureInset();
    },
    setPetHearts(count) {
      hearts.forEach((h, i) => h.classList.toggle('is-full', i < count));
    },
    voiceStatus(status, dog) {
      const message = VOICE_MESSAGES[status];
      if (message) say(message(dog.name), status === 'listening' ? 0 : 4200);
      else toast.classList.remove('is-on');
      $('#do-talk').setAttribute('aria-pressed', String(status === 'listening' || status === 'speaking'));
    },
    heart(x, y) {
      if (reduced) return;
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.addEventListener('animationend', () => heart.remove());
      document.body.appendChild(heart);
    },
  };
}
