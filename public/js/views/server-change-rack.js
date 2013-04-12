var Backbone = require('backbone');


var ChangeRackFormTemplate = function() {
    return '<input class="input input" type="text"><button class="btn btn-primary save">Save</button><button class="btn cancel">Cancel</button>';
};

var ChangeRackForm = Backbone.Marionette.ItemView.extend({
    attributes: {
        'class': 'change-rack-form'
    },
    template: ChangeRackFormTemplate,
    events: {
        'click button.save': 'save',
        'click button.cancel': 'cancel'
    },
    save: function() {
        var self = this;
        var rid = this.$('input').val();
        this.model.update({rack_identifier: rid }, function() {
            self.trigger('save', rid);
        });
    },
    cancel: function() {
        this.trigger('cancel');
        this.remove();
    }
});

module.exports = ChangeRackForm;