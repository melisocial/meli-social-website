/* ==========================================================================
   MELI intake form: sends each submission to Shannon's Google Sheet.
   Shared by the website (#intake) and the /intake page.
   ========================================================================== */
window.MELI_INTAKE = {
  // Booking page (Calendly) for the "Book a free call" button on the /intake page
  bookingUrl: "https://calendly.com/PASTE-YOUR-BOOKING-LINK-HERE",
  // Google Apps Script web app connected to the "MELI Intake Responses" Sheet
  endpoint: "https://script.google.com/macros/s/AKfycbxCCM6vtjyYznw7DqLI9ULXOfj1pe4XHFhjbzT_wr394I88wODnnFwaUy5qL0UztfUpaw/exec"
};

function initIntake(root, opts){
  const form = root.querySelector('form');
  const thanks = root.querySelector('.thanks');
  const sets = [...form.querySelectorAll('fieldset[data-req]')];
  const required = sets.filter(fs => fs.dataset.req !== 'optional');
  const goals = [...form.querySelectorAll('input[name="goals"]')];
  const button = form.querySelector('button[type="submit"]');
  const sendError = form.querySelector('.send-error');
  const emailOk = v => /^\S+@\S+\.\S+$/.test(v);

  function answered(fs){
    const r = fs.dataset.req;
    if (r === 'choice') return !!fs.querySelector('input:checked');
    if (r === 'text') return fs.querySelector('textarea').value.trim().length > 0;
    if (r === 'optional') return fs.querySelector('textarea').value.trim().length > 0;
    if (r === 'details') return [...fs.querySelectorAll('input:not(.hp input)')].every(i => {
      const v = i.value.trim();
      return i.type === 'email' ? emailOk(v) : v.length > 0;
    });
    return true;
  }

  function update(){
    sets.forEach(fs => { if (fs.classList.contains('invalid') && answered(fs)) fs.classList.remove('invalid'); });
    if (opts.onProgress) opts.onProgress(sets.filter(answered).length, sets.length);
  }

  goals.forEach(g => g.addEventListener('change', () => {
    const count = goals.filter(x => x.checked).length;
    goals.forEach(x => { x.disabled = !x.checked && count >= 2; });
  }));
  form.addEventListener('input', update);
  form.addEventListener('change', update);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    sendError.hidden = true;

    let first = null;
    required.forEach(fs => {
      const ok = answered(fs);
      fs.classList.toggle('invalid', !ok);
      if (!ok && !first) first = fs;
    });
    if (first){
      if (first.dataset.req === 'details'){
        const em = form.querySelector('input[type="email"]').value.trim();
        first.querySelector('.error').textContent = em && !emailOk(em)
          ? 'Please check your email address so I can reach you.'
          : 'Please fill in each field so I can reach you.';
      }
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const data = new URLSearchParams();
    const fd = new FormData(form);
    for (const [k, v] of fd.entries()) if (k !== 'goals') data.append(k, String(v).trim());
    data.append('goals', fd.getAll('goals').join(', '));
    data.append('source', opts.source);

    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending';
    try {
      await fetch(window.MELI_INTAKE.endpoint, { method: 'POST', mode: 'no-cors', body: data });
    } catch (err) {
      button.disabled = false;
      button.textContent = label;
      sendError.hidden = false;
      return;
    }

    const first_name = (fd.get('name') || '').trim().split(/\s+/)[0];
    thanks.querySelector('.tname').textContent = first_name || 'friend';
    form.hidden = true;
    if (opts.onDone) opts.onDone();
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  update();
}
