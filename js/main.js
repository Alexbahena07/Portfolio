/**
 * ===================================================================
 * main js - no dependencies (loaded with `defer`, so the DOM is ready)
 *
 * -------------------------------------------------------------------
 */

(function () {

	"use strict";

	/*---------------------------------------------------- */
	/* Light / dark theme toggle
	------------------------------------------------------ */
	var root        = document.documentElement,
		 themeToggle = document.querySelector('.theme-toggle'),
		 themeColor  = document.querySelector('meta[name="theme-color"]'),
		 systemDark  = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

	function storedTheme() {
		try { return localStorage.getItem('theme'); } catch (e) { return null; }
	}

	function applyTheme(theme) {
		var dark = theme === 'dark';
		root.setAttribute('data-theme', theme);
		themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
		themeToggle.setAttribute('aria-pressed', String(dark));
		if (themeColor) themeColor.setAttribute('content', dark ? '#121212' : '#151515');
	}

	if (themeToggle) {
		applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

		themeToggle.addEventListener('click', function () {
			var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
			applyTheme(next);
			try { localStorage.setItem('theme', next); } catch (e) {}
		});

		// follow the OS setting until the visitor picks a theme themselves
		if (systemDark && systemDark.addEventListener) {
			systemDark.addEventListener('change', function (e) {
				var saved = storedTheme();
				if (saved !== 'light' && saved !== 'dark') applyTheme(e.matches ? 'dark' : 'light');
			});
		}
	}


	/*-----------------------------------------------------*/
	/* Navigation Menu
	------------------------------------------------------ */
	var menuToggle = document.querySelector('.menu-toggle'),
		 nav        = document.getElementById('main-navigation');

	function setMenu(open) {
		menuToggle.classList.toggle('is-clicked', open);
		nav.classList.toggle('is-open', open);
		menuToggle.setAttribute('aria-expanded', String(open));
		menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
	}

	if (menuToggle && nav) {
		menuToggle.addEventListener('click', function () {
			setMenu(!nav.classList.contains('is-open'));
		});

		nav.addEventListener('click', function (e) {
			if (e.target.closest('a')) setMenu(false);
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && nav.classList.contains('is-open')) {
				setMenu(false);
				menuToggle.focus();
			}
		});

		document.addEventListener('click', function (e) {
			if (nav.classList.contains('is-open') && !e.target.closest('.top-bar')) setMenu(false);
		});
	}


	/*---------------------------------------------------- */
	/* Highlight the current section in the navigation bar
	------------------------------------------------------ */
	var navLinks = document.querySelectorAll('#main-navigation a');

	if ('IntersectionObserver' in window && navLinks.length) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				navLinks.forEach(function (link) {
					link.parentElement.classList.toggle('current', link.getAttribute('href') === '#' + entry.target.id);
				});
			});
		}, { rootMargin: '-40% 0px -55% 0px' });

		document.querySelectorAll('main section[id]').forEach(function (section) {
			observer.observe(section);
		});
	}


	/*---------------------------------------------------- */
	/* Footer year
	------------------------------------------------------ */
	var year = document.getElementById('year');
	if (year) year.textContent = new Date().getFullYear();


	/*---------------------------------------------------- */
	/*	contact form
	------------------------------------------------------ */

	/* Native validation + fetch() to FormSubmit's AJAX endpoint.
	   The form's action attribute stays as a no-JS fallback. */
	var contactForm = document.getElementById('contactForm');

	if (contactForm && window.fetch) {

		var submitBtn = contactForm.querySelector('button[type="submit"]'),
			 sLoader   = document.getElementById('submit-loader'),
			 sWarning  = document.getElementById('message-warning'),
			 sSuccess  = document.getElementById('message-success'),
			 ajaxUrl   = contactForm.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');

		function show(el) { el.style.display = 'block'; }
		function hide(el) { el.style.display = 'none'; }

		function showSuccess() {
			hide(contactForm);
			show(sSuccess);
			sSuccess.focus();
		}

		function showError(text) {
			// textContent, never innerHTML, so server/user text can't inject markup
			sWarning.textContent = text;
			show(sWarning);
		}

		contactForm.addEventListener('submit', async function (e) {

			e.preventDefault();
			hide(sWarning);

			if (!contactForm.checkValidity()) {
				contactForm.reportValidity();
				return;
			}

			var data = Object.fromEntries(new FormData(contactForm));

			// honeypot filled in = bot; pretend success and drop it
			if (data._honey) {
				showSuccess();
				return;
			}

			data._subject = 'Portfolio contact: ' + data.subject;
			data._replyto = data.email;

			submitBtn.disabled = true;
			show(sLoader);

			var controller = new AbortController(),
				 timeout    = setTimeout(function () { controller.abort(); }, 15000);

			try {
				var res = await fetch(ajaxUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json'
					},
					body: JSON.stringify(data),
					signal: controller.signal
				});

				var json = await res.json().catch(function () { return {}; });

				// FormSubmit returns success as the string "true"
				if (!res.ok || String(json.success) !== 'true') {
					throw new Error(json.message || 'Request failed (' + res.status + ')');
				}

				contactForm.reset();
				showSuccess();

			} catch (err) {
				console.error('Contact form error:', err);
				showError(err.name === 'AbortError'
					? 'The request timed out. Please try again.'
					: 'Something went wrong sending your message. Please try again, or email me directly at alex.bahena.cs@gmail.com.');

			} finally {
				clearTimeout(timeout);
				hide(sLoader);
				submitBtn.disabled = false;
			}

		});

	}

})();
