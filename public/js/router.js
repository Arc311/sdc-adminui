var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');

var Marionette = require('backbone.marionette');
var User = require('./models/user');
var SigninView = require('./views/signin');
var AppView = require('./views/app');

var NotFoundView = require('./views/error/not-found');
var Components = {
    'alarm': require('./components/alarm')
};

var Views = {
    'vms': require('./views/vms'),
    'vm': require('./views/vm'),
    'provision': require('./views/provision-vm'),
    'servers': require('./views/servers'),
    'server': require('./views/server'),

    'users': require('./views/users'),
    'user': require('./views/user'),

    'packages': require('./views/packages'),
    'packages-form': require('./views/packages-form'),
    'package': require('./views/package'),

    'dashboard': require('./views/dashboard'),

    'settings': require('./views/settings'),

    'images': require('./views/images'),
    'image': require('./views/image'),

    'image-import': require('./views/image-import'),

    'jobs': require('./views/jobs'),
    'job': require('./views/job'),

    'networking': require('./views/networking'),
    'networks': require('./views/networks'),
    'network': require('./views/network'),

    'nictag': require('./views/nictag'),

    'services': require('./views/services')
};

module.exports = Backbone.Marionette.AppRouter.extend({
    routes: {
        'signin': 'showSignin',
        'vms': 'showVms',
        'vms/:uuid': 'showVm',
        'users/:uuid': 'showUser',
        'image-import': 'showImageImport',
        'images/:uuid': 'showImage',
        'jobs/:uuid': 'showJob',
        'networks/:uuid': 'showNetwork',
        'packages/:uuid': 'showPackage',
        'servers/:uuid': 'showServer',
        'nictags/:uuid': 'showNicTag',
        'networking': 'showNetworking',
        'networking/:tab': 'showNetworking',
        'alarms/:uuid': 'showAlarm',
        '*default': 'defaultAction'
    },
    initialize: function(options) {
        this.app = options.app;
        this.app.user = this.app.user || (this.user = User.currentUser());
    },

    didAuthenticate: function(data) {
        this.setupRequestToken();
        this.setupDatacenter();

        this._checkAuth = true;
        if (typeof(Backbone.history.fragment) !== 'undefined') {
            Backbone.history.loadUrl(Backbone.history.fragment);
        }
    },

    setupDatacenter: function() {
        this.app.state.set({
            datacenter: this.user.getDatacenter()
        });
    },

    setupRequestToken: function() {
        $.ajaxSetup({
            timeout: 10000,
            headers: {'x-adminui-token': this.app.user.getToken()}
        });
    },

    checkAuth: function() {
        if (this._checkAuth === true) {
            return true;
        } else {
            var xhr = $.ajax({
                type: 'GET',
                timeout: 5000,
                url: '/_/auth',
                async: false,
                error: function(x, t, m) {
                    console.log("auth: ", t);
                    if (t==="timeout") {
                        window.alert("One more the services required for Authentication Timed out.");
                    }
                }
            });
            return (xhr.status !== 403);
        }
    },

    renderTitle: function() {
        document.title = [
            this.app.state.get('datacenter'),
            'Operations Portal'
        ].join(' | ');
    },

    start: function() {
        this.listenTo(this.app.vent, 'showview', this.presentView, this);
        this.listenTo(this.app.vent, 'signout', this.signout, this);
        this.listenTo(this.app.vent, 'notfound', this.notFound, this);
        this.listenTo(this.app.user, 'authenticated', this.didAuthenticate, this);
        this.listenTo(this.app.state, 'change:datacenter', this.renderTitle);

        if (this.user.authenticated()) {
            this.setupRequestToken();
            this.setupDatacenter();
        }

        var self = this;

        $(document).ajaxError(function(e, xhr, settings, exception) {
            if (xhr.status === 403) {
                self.signout();
            }
        });


        // enable selection
        $(document).on('click', '.selectable', function() {
            var range;

            if (document.selection) {
                range = document.body.createTextRange();
                range.moveToElementText(this);
                range.select();
            } else if (window.getSelection) {
                range = document.createRange();
                range.selectNode(this);
                window.getSelection().addRange(range);
            }
        });
    },

    defaultAction: function(page) {
        console.log(_.str.sprintf('[route] defaultAction: %s', page));

        if (this.authenticated()) {
            page = page || 'dashboard';
            this.presentView(page);
        }
    },

    authenticated: function() {
        if (! this.user.authenticated()) {
            console.log('[app] not authenticated, showing sign in');
            this.showSignin();
            return false;
        } else {
            return this.checkAuth();
        }
    },

    initializeAppView: function() {
        if (false === this.app.chrome.currentView instanceof AppView) {
            var appView = new AppView({
                vent: this.app.vent,
                user: this.user
            });
            this.app.chrome.show(appView);
        }
    },

    presentPageComponent: function(viewName, args) {
        var componentClass = Views[viewName];
        var component = new componentClass(args);
        React.renderComponent(component, this.app.chrome.currentView.content.$el.get(0))
    },

    presentView: function(viewName, args) {
        this.initializeAppView();

        var View = Views[viewName];

        if (typeof(View) === 'undefined') {
            this.notFound({
                view: viewName,
                args: args
            });
            console.log("View not found: " + viewName);
        } else {
            var view = new View(args);

            this.applySidebar(view);
            this.applyUrl(view);
            this.app.chrome.currentView.content.show(view, args);
        }
    },

    presentComponent: function(comp, args) {

        args = args || {};
        var comp = Components[comp];

        if (typeof(comp) === 'undefined') {
            this.notFound({
                view: comp,
                args: args
            });
            console.log("Component not found: " + comp);
        } else {
            this.initializeAppView();
            var el = this.app.chrome.currentView.content.el;
            var container = this.app.chrome.currentView.content.getEl(el).get(0);
            React.renderComponent(new comp(args), container);
        }
    },

    notFound: function(args) {
        this.initializeAppView();
        var view = new NotFoundView(args);
        this.app.chrome.currentView.content.show(view);
    },

    applySidebar: function(view) {
        if (typeof(view.sidebar) === 'string') {
            this.app.vent.trigger('mainnav:highlight', view.sidebar);
        } else {
            this.app.vent.trigger('mainnav:highlight', view.name);
        }
    },

    applyUrl: function(view) {
        if (typeof(view.url) === 'function') {
            Backbone.history.navigate(view.url());
        } else if (typeof(view.url) === 'string') {
            Backbone.history.navigate(view.url);
        }
    },

    showAlarm: function(uuid) {
        if (this.authenticated()) {
            this.presentComponent('alarm', {uuid: uuid});
        }
    },

    showVms: function() {
        if (this.authenticated()) {
            this.presentView('vms');
        }
    },

    showNetworking: function(tab) {
        if (this.authenticated()) {
            this.presentView('networking', {tab: tab});
        }
    },

    showNetwork: function(uuid) {
        var self = this;
        if (this.authenticated()) {
            var Network = require('./models/network');
            var net = new Network({uuid: uuid});
            net.fetch().done(function() {
                self.presentView('network', { model: net });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'networks',
                    args: {uuid: uuid},
                    xhr: xhr
                });
            });
        }
    },

    showNicTag: function(name) {
        var self = this;
        if (this.authenticated()) {
            var Nictag = require('./models/nictag');
            var nt = new Nictag({name: name});
            nt.fetch().done(function() {
                self.presentView('nictag', { model: nt });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'nictag',
                    args: {name: name},
                    xhr: xhr
                });
            });
        }
    },


    showPackage: function(uuid) {
        var self = this;
        if (this.authenticated()) {
            var Package = require('./models/package');
            var p = new Package({uuid: uuid});
            p.fetch().done(function() {
                self.presentView('package', { model: p });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'package',
                    args: {uuid: uuid},
                    xhr: xhr
                });
            });
        }
    },

    showMonitoring: function() {
        if (this.authenticated()) {
            this.presentView('monitoring');
        }
    },

    showImage: function(uuid) {
        var self = this;
        if (this.authenticated()) {
            var Img = require('./models/image');
            var img = new Img({uuid: uuid});
            img.fetch().done(function() {
                self.presentView('image', { image: img });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'image',
                    args: {uuid: uuid},
                    xhr: xhr
                });
            });
        }
    },

    showJob: function(uuid) {
        var self = this;
        if (this.authenticated()) {
            var Job = require('./models/job');
            var job = new Job({uuid: uuid});
            job.fetch().done(function() {
                self.presentView('job', { model: job });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'image',
                    args: {uuid: uuid},
                    xhr: xhr
                });
            });
        }
    },

    showImageImport: function() {
        if (this.authenticated()) {
            this.presentView('image-import');
        }
    },

    showVm: function(uuid) {
        var self = this;
        if (this.authenticated()) {
            var Vm = require('./models/vm');
            var vm = new Vm({uuid: uuid});
            vm.fetch().done(function() {
                self.presentView('vm', { vm: vm });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'vm',
                    args: {uuid: uuid},
                    xhr: xhr
                });
            });
        }
    },

    showUser: function(uuid) {
        console.log(_.str.sprintf('[route] showUser: %s', uuid));
        var self = this;
        if (this.authenticated()) {
            var User = require('./models/user');
            var user = new User({uuid: uuid});
            user.fetch().done(function() {
                self.presentView('user', { user: user });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'user',
                    args: {uuid: uuid},
                    xhr: xhr
                });
            });
        }
    },

    showServer: function(uuid) {
        console.log(_.str.sprintf('[route] showServer: %s', uuid));
        var self = this;
        if (this.authenticated()) {
            var Server = require('./models/server');
            var server = new Server({uuid: uuid});
            server.fetch().done(function() {
                self.presentView('server', { server: server });
            }).fail(function(xhr) {
                self.notFound({
                    view: 'server',
                    args: {uuid: uuid},
                    xhr: xhr
                });
            });
        }
    },

    showSignin: function() {
        console.log('[route] showSignin');
        var signinView = new SigninView({model: this.user});
        this.app.chrome.show(signinView);
    },

    signout: function() {
        this.user.signout();
        this.showSignin();
    }
});
