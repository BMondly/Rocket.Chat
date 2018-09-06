Package.describe({
	name: 'rocketchat:nrr',
	summary: 'Non-Reactive render',
	version: '1.0.0',
	git: '',
});

Package.onUse(function(api) {
	api.use('ecmascript');

	api.mainModule('nrr.js');
});

/* saved as CRLF in RC-develop GitHub Repo */
