/** @jsx React.DOM */

var React = require('react');
var BB = require('../../bb.jsx');

var Vms = require('../../../models/vms');

var VmsList = require('../../../views/vms-list');
var VmsFilter = require('../../../views/user-vms-filter');

var UserVmsComponent = React.createClass({
    componentWillMount: function() {
        this.vms = new Vms(null, {
            params: {
                owner_uuid: this.props.uuid,
                state: 'active',
                sort: 'create_timestamp.desc'
            },
            perPage: 20
        });

        this.vmsList = new VmsList({collection: this.vms });
        this.vmsFilter = new VmsFilter();
        this.vmsFilter.on('query', this._onVmsFilter, this);
        this.vms.fetch();
    },
    componentWillUnmount: function() {
        this.vmsFilter.off('query');
    },
    _onVmsFilter: function(params) {
        this.vms.fetch({params: params});
    },
    render: function() {
        var vmsList = this.vmsList;
        var vmsFilter = this.vmsFilter;

        return <div className="row">
            <div className="col-md-12">
                <h3>Virtual Machines</h3>
                <div className="vms-filter-region"><BB key="filter" view={vmsFilter} /></div>
                <div className="vms-region"><BB key="list" view={vmsList} /></div>
            </div>
        </div>;
    }
});

module.exports = UserVmsComponent;

