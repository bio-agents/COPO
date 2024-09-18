/**
 * Created by fshaw on 06/12/2016.
 */
$(document).ready(function () {

    //******************************Setup Annotator Specifics*************************//

    $.cookie('document_id', 'undefined', {expires: 1, path: '/',});

    $(document).data('annotator', true)

    $(document).ajaxStart(function () {
        $('#processing_div').show()
    })
    $(document).ajaxStop(function () {
        $('#processing_div').hide()
    })


    //******************************Event Handlers Block*************************//
    // get table data to display via the DataTables API
    var tableID = null; //rendered table handle
    var component = "annotation";
    var copoFormsURL = "/copo/copo_forms/";
    var copoVisualsURL = "/copo/copo_visualize/";
    var annotationURL = "/copo/get_annotation/"

    csrftoken = $.cookie('csrftoken');

    $.ajax({
        url: copoVisualsURL,
        type: "POST",
        headers: {'X-CSRFToken': csrftoken},
        data: {
            'task': 'table_data',
            'component': component
        },
        success: function (data) {
            do_render_table(data);
        },
        error: function () {
            alert("Couldn't retrieve annotation data!");
        }
    });


    //event handler for resolving doi and pubmed
    $('.resolver-submit').on('click', function (event) {
        var elem = $($(event.target)).parent().parent().find(".resolver-data");

        var idHandle = elem.val();

        idHandle = idHandle.replace(/^\s+|\s+$/g, '');

        if (idHandle.length == 0) {
            return false;
        }

        $("#doiLoader").html("<div style='text-align: center'><i class='fa fa-spinner fa-pulse fa-2x'></i></div>");

        var idType = elem.attr("data-resolver");

        //reset input field to placeholder
        elem.val("");

        $.ajax({
            url: copoFormsURL,
            type: "POST",
            headers: {'X-CSRFToken': csrftoken},
            data: {
                'task': 'doi',
                'component': component,
                'id_handle': idHandle,
                'id_type': idType
            },
            success: function (data) {
                json2HtmlForm(data);
                $("#doiLoader").html("");
            },
            error: function () {
                $("#doiLoader").html("");
                alert("Couldn't resolve resource handle!");
            }
        });
    });

    // handle/attach events to table buttons
    $('body').on('addbuttonevents', function (event) {
        tableID = event.tableID;

        $(document).on("click", ".copo-dt", function (event) {
            do_record_task($(this));
        });

    });

    //instantiate/refresh agenttips
    refresh_agent_tips();

    //******************************Functions Block******************************//

    function do_record_task(elem) {
        var task = elem.attr('data-record-action').toLowerCase(); //action to be performed e.g., 'Edit', 'Delete'
        var taskTarget = elem.attr('data-action-target'); //is the task targeting a single 'row' or group of 'rows'?

        var ids = [];

        if (taskTarget == 'row') {
            ids = [elem.attr('data-record-id')];
        } else if (taskTarget == 'rows') {
            //get reference to table, and retrieve selected rows
            if ($.fn.dataTable.isDataTable('#' + tableID)) {
                var table = $('#' + tableID).DataTable();

                ids = $.map(table.rows('.selected').data(), function (item) {
                    return item[item.length - 1];
                });
            }
        }

        //handle button actions
        if (ids.length > 0) {
            if (task == "edit") {
                $.ajax({
                    url: annotationURL,
                    type: "POST",
                    headers: {'X-CSRFToken': csrftoken},
                    dataType: 'json',
                    data: {
                        'task': 'form',
                        'component': component,
                        'target_id': ids[0] //only allowing row action for edit, hence first record taken as target
                    },
                    success: function (e) {
                        $('#annotation_table_wrapper').hide()
                        $('#annotation_content').show()
                        var initAnnotator = false
                        if (!$.trim($("#annotation_content").html())) {
                            // if #annotation_content is empty
                            initAnnotator = true
                        }
                        $('#annotation_content').html(e.html)
                        $.cookie('document_id', e._id.$oid, {expires: 1, path: '/',});
                        $('#file_picker_modal').modal('hide')
                        if (initAnnotator) {
                            setup_annotator()
                            setup_autocomplete()
                        }

                    },
                    error: function () {
                        alert("Couldn't build publication form!");
                    }
                });
            } else if (task == "delete") { //handles delete, allows multiple row delete
                var deleteParams = {component: component, target_ids: ids};
                do_component_delete_confirmation(deleteParams);
            }
        }
    }

})//end document ready

function setup_annotator(element) {
    // setup cookie to store uri for annotation


    // setup csrf token and annotator plugins
    var csrftoken = $.cookie('csrftoken');
    var app = new annotator.App();
    app.include(annotator.ui.main)
    app.include(annotator.storage.http, {
        prefix: 'http://127.0.0.1:8000/api',
        headers: {
            'X-CSRFToken': csrftoken,
        },
    });
    app.start().then(function () {
        app.annotations.load();
    });

    // attach data parameter stating that this page is using annotator, therefore what autocomplete should do
    $(this).data('annotator', true)
}