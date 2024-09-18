//**some re-usable functions across different modules
var AnnotationEventAdded = false;
$(document).ready(function () {

    setup_autocomplete()
    do_component_navbar($("#nav_component_name").val());

});

function setup_autocomplete(){
    var copoFormsURL = "/copo/copo_forms/";

    $(document).on('focus', 'input[id^="annotator-field"]', function (e) {
        t = e.currentTarget
        $('.annotator-listing').find('ul').empty()

        if (!AnnotationEventAdded) {
            $(t).attr('data-autocomplete', '/copo/ajax_search_ontology/999/')
            auto_complete();
            AnnotationEventAdded = true;
        }

    })
    auto_complete();
}


function do_component_delete_confirmation(params) {
    var targetComponentBody = "Please confirm delete action for the selected records.";
    var targetComponentTitle = "Delete Alert!";

    var doTidyClose = {
        closeIt: function (dialogRef) {
            dialogRef.close();
        }
    };

    var code = BootstrapDialog.show({
        type: BootstrapDialog.TYPE_DANGER,
        title: $('<span>' + targetComponentTitle + '</span>'),
        message: function () {
            var $message = $('<span>' + targetComponentBody + '</span>');
            return $message;
        },
        draggable: true,
        closable: true,
        animate: true,
        onhide: function () {
        },
        buttons: [
            {
                label: 'Cancel',
                action: function (dialogRef) {
                    doTidyClose["closeIt"](dialogRef);
                }
            },
            {
                icon: 'glyphicon glyphicon-trash',
                label: 'Delete',
                cssClass: 'btn-danger',
                action: function (dialogRef) {

                    csrftoken = $.cookie('csrftoken');
                    var target_ids = JSON.stringify(params.target_ids);

                    $.ajax({
                        url: copoFormsURL,
                        type: "POST",
                        headers: {'X-CSRFToken': csrftoken},
                        data: {
                            'task': "delete",
                            'component': params.component,
                            'target_ids': target_ids
                        },
                        success: function (data) {
                            do_render_table(data);
                        },
                        error: function () {
                            alert("Couldn't delete records!");
                        }
                    });

                    doTidyClose["closeIt"](dialogRef);

                }
            }
        ]
    });
}

function do_render_table(data) {
    var table = null;
    var lastRecord = null;
    var filterDivObject = null;
    var lengthDivObject = null;

    if ($.fn.dataTable.isDataTable('#' + data.table_data.table_id)) {
        //if table instance already exists, then this is probably a refresh after an CRUD operation
        table = $('#' + data.table_data.table_id).DataTable();
    }


    if (data.table_data.row_data) {
        //adding single record to table

        if (table) { //this test is probably redundant, but...you never can tell!
            //remove previously highlighted row
            table
                .rows('.row-insert-higlight')
                .nodes()
                .to$()
                .removeClass('row-insert-higlight');

            var rowNode = table
                .row.add(data.table_data.row_data)
                .draw()
                .node();

            //highlight new row
            $(rowNode)
                .addClass('row-insert-higlight')
                .animate({color: 'black'});

            lastRecord = data.table_data.row_data;

        }
    } else {
        //probably first time rendering table, or maybe a call to refresh whole table, say after a delete action

        if (table) { //definitely a call to refresh table, as table instance exists!
            table.clear().draw();
            table.rows.add(data.table_data.dataSet); // Add new data
            table.columns.adjust().draw();
            return;
        }


        //get default ordering index;
        //ideally we would want to order by record creation date.
        //if it exists, it should be the last but one item in the columns list
        var orderIndx = 0;
        if (data.table_data.columns.length > 2) {
            orderIndx = data.table_data.columns.length - 2;
        }

        //custom column rendering
        var colDefs = [];

        //button coldefs
        var btnDef = {
            targets: -1,
            data: null,
            searchable: false,
            orderable: false,
            render: function (rdata) {
                var rndHTML = "";
                if (data.table_data.action_buttons.row_btns) {
                    var bTns = data.table_data.action_buttons.row_btns; //row buttons
                    rndHTML = '<span style="white-space: nowrap;">';
                    for (var i = 0; i < bTns.length; ++i) {
                        rndHTML += '<a data-action-target="row" data-record-action="'
                            + bTns[i].btnAction + '" data-record-id="'
                            + rdata[rdata.length - 1]
                            + '" data-toggle="agenttip" style="display: inline-block; white-space: normal;" title="'
                            + bTns[i].text + '" class="' + bTns[i].className + ' btn-xs"><i class="'
                            + bTns[i].iconClass + '"> </i><span></span></a>&nbsp;';
                    }
                    rndHTML += '</span>';
                }
                return rndHTML;
            }
        };

        colDefs.push(btnDef);

        //determine how columns are rendered - cols definition
        var custDef;
        var v = [];
        for (var i = 0; i < data.table_data.columns.length - 1; ++i) {
            v.push(i)
        }

        //exception for datafile table, it treats the first column differently
        if (data.table_data.table_id == 'datafile_table') {
            v.splice(0, 1);
        }

        custDef = {
            targets: v,
            data: data,
            render: function (data, type, row, meta) {
                var rndHTML = "";
                if (Object.prototype.toString.call(data[meta.col]) === '[object String]') {
                    rndHTML = data[meta.col];
                } else if (typeof data[meta.col] === "object") {
                    var collapseLink = data[data.length - 1] + "_" + meta.col;
                    rndHTML = get_data_item_collapse(collapseLink, get_data_list_panel(data[meta.col], collapseLink), data[meta.col].length);
                }

                return rndHTML;
            }
        };

        colDefs.push(custDef);


        //end cols definition

        //column def for datafile table
        if (data.table_data.table_id == 'datafile_table') {
            colDefs.push({
                targets: 0,
                data: null,
                render: function (rdata) {
                    var containerRow = $('<div/>', {
                        class: "row",
                        style: "margin-left:-10px; white-space: nowrap; margin-right: 5px;"
                    });

                    var metadataDiv = $('<div></div>')
                        .attr({
                            "class": "col-sm-1 col-md-1 col-lg-1 itemMetadata-flag",
                            "data-record-id": rdata[rdata.length - 1],
                            "style": "cursor: hand; cursor: pointer; display: inline-block;"
                        });

                    var spanPoor = $('<span/>', {
                        class: "itemMetadata-flag-ind meta-active poor",
                        style: "margin-top: 3px;"
                    });

                    var spanFair = $('<span/>', {
                        class: "itemMetadata-flag-ind fair"
                    });

                    var spanGood = $('<span/>', {
                        class: "itemMetadata-flag-ind good"
                    });

                    metadataDiv.append(spanPoor).append(spanFair).append(spanGood);

                    var dataDiv = $('<div></div>')
                        .attr({
                            "class": "col-sm-11 col-md-11 col-lg-11",
                            "style": "margin-left: -10px; margin-top: 10px; display: inline-block;"
                        });

                    var dataSpan = $('<span/>', {
                        html: rdata[0]
                    });

                    var descFlagSpan = $('<i></i>')
                        .attr({
                            "class": "fa fa-tags inDescription-flag",
                            "data-record-id": rdata[rdata.length - 1],
                            "data-toggle": "agenttip",
                            "style": "padding-left: 5px; display: none;",
                            "title": "Currently being described"
                        });

                    dataDiv.append(dataSpan).append(descFlagSpan);
                    containerRow.append(metadataDiv).append(dataDiv);

                    return $('<div></div>').append(containerRow).html();

                }
            });
        }

        var scrollX = true;

        if (data.table_data.table_id == "datafile_table") {
            //scroll has undesirable effect on this table
            scrollX = false;
        }

        table = $('#' + data.table_data.table_id).DataTable({
            data: data.table_data.dataSet,
            columns: data.table_data.columns,

            paging: true,
            ordering: true,
            scrollX: scrollX,
            lengthChange: true,
            order: [[orderIndx, "desc"]],
            select: {
                style: 'multi'
            },
            dom: 'lf<"row button-rw">rtip',
            "fnDrawCallback": function (oSettings) {
                refresh_agent_tips();

                $('.dataTables_filter').each(function () {
                    if ($(this).attr("id") == data.table_data.table_id + "_filter") {
                        filterDivObject = $(this);
                        return false;
                    }
                });

                $('.dataTables_length').each(function () {
                    if ($(this).attr("id") == data.table_data.table_id + "_length") {
                        lengthDivObject = $(this);
                        return false;
                    }
                });

                //trigger metadata refresh for datafiles
                if (data.table_data.table_id == 'datafile_table') {
                    var event = jQuery.Event("refreshmetadataevents");
                    $('body').trigger(event);
                }

            },
            columnDefs: colDefs
        });

        //attach global action buttons
        if (data.table_data.action_buttons.global_btns) {
            var custBtns = data.table_data.action_buttons.global_btns; //global buttons
            var actBtns = ['selectAll', 'selectNone'];
            var bTns = custBtns.concat(actBtns);
            new $.fn.dataTable.Buttons(table, {
                buttons: bTns
            });

            table
                .buttons()
                .nodes()
                .each(function (value) {
                    $(this).addClass(' btn-sm');
                });

            table
                .buttons('.copo-dt')
                .nodes()
                .each(function (value) {
                    var btnImage;
                    for (var i = 0; i < bTns.length; ++i) {
                        if (bTns[i].text == this.text) {
                            btnImage = bTns[i];
                            break;
                        }
                    }

                    $(this).removeClass('btn-default'); //remove default class
                    $(this).addClass(this.className); //attach supplied class
                    $(this).attr('data-record-action', btnImage.btnAction); //data attribute to signal action type
                    $(this).attr('data-action-target', 'rows'); //data attribute to signal batch action
                    //
                    ////attach icon to button
                    try {
                        $('<i class="' + bTns[value].iconClass + '">&nbsp;</i>').prependTo($(this));
                    }
                    catch (err) {
                    }

                });

            $("div.button-rw").append(filterDivObject);
            $("div.button-rw").append(lengthDivObject);
            $("div.button-rw").append($(table.buttons().container()));
            $(lengthDivObject).addClass("pad-it");


        }

        //create a hook for attaching button events in individual table handlers
        if ($.fn.dataTable.isDataTable('#' + data.table_data.table_id)) {
            var tableID = data.table_data.table_id;
            var event = jQuery.Event("addbuttonevents");
            event.tableID = tableID;
            $('body').trigger(event);
        }

    }


    //handle requests for specific tables...
    if (data.table_data.table_id == "datafile_table") {
        table = $('#' + data.table_data.table_id).DataTable();
        if (table && lastRecord) { //trigger event for queuing record
            var event = jQuery.Event("addtoqueue");
            event.recordLabel = lastRecord[0];
            event.recordID = lastRecord[lastRecord.length - 1];
            $('body').trigger(event);
        }
    }

} //end of function


function refresh_agent_tips() {
    $("[data-toggle='agenttip']").agenttip();
    $("[data-toggle='popover']").popover();


    apply_color();
    refresh_selectbox();
    refresh_multiselectbox();
    refresh_multisearch();
    refresh_range_slider();
    auto_complete();


} //end of func

function refresh_validator(formObject) {
    formObject.validator('update');

} //end of func

function refresh_range_slider() {
    $('.range-slider').each(function () {
        var elem = $(this);

        var outputElem = elem.closest(".range-slider-parent").find(".range-slider-output");
        var elemValue = elem.closest(".range-slider-parent").find(".elem-value");

        elem.rangeslider({

            // Feature detection the default is `true`.
            // Set this to `false` if you want to use
            // the polyfill also in Browsers which support
            // the native <input type="range"> element.
            polyfill: false,

            // Default CSS classes
            rangeClass: 'rangeslider',
            disabledClass: 'rangeslider--disabled',
            horizontalClass: 'rangeslider--horizontal',
            verticalClass: 'rangeslider--vertical',
            fillClass: 'rangeslider__fill',
            handleClass: 'rangeslider__handle',

            // Callback function
            onInit: function () {
            },

            // Callback function
            onSlide: function (position, value) {
                outputElem.html(value);
            },

            // Callback function
            onSlideEnd: function (position, value) {
                outputElem.html(value);
                elemValue.val(value);
            }
        });
    });

}//end of function


//refreshes selectboxes to pick up events
function refresh_selectbox() {
    $('.copo-select').each(function () {
        var elem = $(this);

        if (!(/selectize/i.test(elem.attr('class')))) { // if not already instantiated
            var funSelect = elem.selectize({
                delimiter: ',',
                plugins: ['remove_button'],
                persist: false,
                create: function (input) {
                    return {
                        value: input,
                        text: input
                    }
                }
            });
        }
    });

}//end of function

function refresh_multiselectbox() {
    $('.copo-multi-select').each(function () {
        var elem = $(this);
        var valueElem = elem.closest('.copo-form-group').find('.copo-multi-values');
        var maxTems = 'null'; //maximum selectable items


        if (valueElem.is("[data-maxItems]")) {
            maxTems = valueElem.attr("data-maxItems");
        }

        if (!(/selectize/i.test(elem.attr('class')))) { // if not already instantiated
            var $funSelect = elem.selectize({
                onChange: function (value) {
                    if (value) {
                        valueElem.val(value)
                            .trigger('change');
                    } else {
                        valueElem.val("");
                    }
                },
                dropdownParent: 'body',
                maxItems: maxTems,
                plugins: ['remove_button']
            });

            //set default values
            var control = $funSelect[0].selectize;
            control.setValue(valueElem.val().split(",")); //set default value
        }
    });
}


function refresh_multisearch() {
    $('.copo-multi-search').each(function () {
        var elem = $(this);

        if (!(/selectize/i.test(elem.attr('class')))) { // if not already instantiated
            var valueElem = elem.closest('.copo-form-group').find('.copo-multi-values');
            var elemSpecs = JSON.parse(elem.closest('.copo-form-group').find('.elem-json').val());
            var maxTems = 'null'; //maximum selectable items

            if (valueElem.is("[data-maxItems]")) {
                maxTems = valueElem.attr("data-maxItems");
            }

            var $funSelect = elem.selectize({
                onChange: function (value) {
                    if (value) {
                        valueElem.val(value)
                            .trigger('change');
                    } else {
                        valueElem.val("");
                    }
                },
                dropdownParent: 'body',
                maxItems: maxTems,
                persist: false,
                plugins: ['remove_button'],
                valueField: elemSpecs.value_field,
                labelField: elemSpecs.label_field,
                searchField: elemSpecs.search_field,
                options: elemSpecs.options,
                render: {
                    item: function (item, escape) {
                        return '<div>' +
                            (item[elemSpecs.label_field] ? '<span>'
                            + escape(item[elemSpecs.label_field]) + '</span>' : '') +
                            '</div>';
                    },
                    option: function (item, escape) {
                        var label = ''; // item[elemSpecs.label_field];
                        var caption = '<div>';
                        for (var i = 0; i < elemSpecs.secondary_label_field.length; ++i) {
                            caption += '<div class="text-success">' + item[elemSpecs.secondary_label_field[i]] + '</div>';
                        }
                        caption += "</div>";

                        return '<div>' +
                            '<span class="caption">' + escape(label) + '</span>' +
                            (caption ? '<div class="caption">' + caption + '</div>' : '') +
                            '</div>';
                    }
                }
            });


            var control = $funSelect[0].selectize;
            control.setValue(valueElem.val().split(",")); //set default value
        }

    });
}

//set up agent tips; a medium for transmitting info about form elements
function setup_formelement_hint(switchElem, inputElements) {
    // $('.popover').popover('destroy');

    inputElements.focus(function () {
        var elem = $(this).closest(".copo-form-group");
        var state = true;
        if (elem.length) {
            try {
                state = switchElem.bootstrapSwitch('state');
            }
            catch (err) {
                ;
            }

            if (state) {
                var title = elem.find("label").html();
                var content = "";
                if (elem.find(".form-input-help").length) {
                    content = (elem.find(".form-input-help").html());
                }

                $('.popover').popover('destroy'); //hide any shown popovers


                var pop = elem.popover({
                    title: title,
                    content: content,
                    container: 'body',
                    template: '<div class="popover copo-popover-popover1"><div class="arrow">' +
                    '</div><div class="popover-inner"><h3 class="popover-title copo-popover-title1">' +
                    '</h3><div class="popover-content"><p></p></div></div></div>'
                });

                pop.popover('show');
            } else {
                elem.popover('destroy');
                // $('.popover').popover('destroy');
            }
        }

    });

}//end of function


var auto_complete = function () {
    console.log('refresh autocomplete')
    AutoComplete({
        post: do_post,
        select: do_select,
        autoFocus: true
    });

    function do_select(input, item) {

        if ($(document).data('annotator')) {

            item = $(item).closest('li');
            console.log('here')
            console.log($(item).data('term_accession'))
            $(input).val($(item).data('annotation_value') + ' :-: ' + $(item).data('term_accession'))
        }
        else {
            item = $(item).closest('li');
            $(input).val($(item).data('annotation_value'));
            $(input).siblings("[id*='termSource']").val($(item).data('term_source'));
            $(input).siblings("[id*='termAccession']").val($(item).data('term_accession'));
        }

        return false;
    }

    function do_post(result, response, custParams) {
        response = JSON.parse(response);
        console.log("num_found " + response.response.numFound);
        var properties = Object.getOwnPropertyNames(response);
        //Try parse like JSON data

        var empty,
            length = response.length,
            li = domCreate("li"),
            ul = domCreate("ul");

        //Reverse result if limit parameter is custom
        if (custParams.limit < 0) {
            properties.reverse();
        }


        for (var item in response.response.docs) {

            doc = response.response.docs[item];


            try {
                //
                //console.log(response.highlighting[doc.id])
                //console.log(doc)
                var s;
                s = response.highlighting[doc.id].label;
                if (s == undefined) {
                    s = response.highlighting[doc.id].synonym
                }
                var desc;
                if (doc.ontology_prefix == undefined) {
                    desc = "Origin Unknown"
                }
                else {
                    desc = doc.ontology_prefix
                }
                li.innerHTML = '<span class="label label-info"><span title="' + desc + '" style="color:white; padding-top:3px; padding-bottom:3px"><img style="height:15px; margin-right:10px" src="/static/copo/img/ontology.png"/>' + doc.ontology_prefix + ':' + doc.label + ' ' + '</span>' + ' - ' + '<span style="color:#fcff5e">' + doc.obo_id + '</span></span>';


                $(li).attr('data-id', doc.id);
                var styles = {
                    margin: "2px",
                    marginTop: '4px',
                    fontSize: "large",

                };
                $(li).css(styles);
                $(li).attr('data-term_accession', doc.iri);
                $(li).attr('data-annotation_value', doc.label);
                var s = doc.obo_id;
                s = s.split(':')[0];

                $(li).attr('data-term_source', s);
                //$(li).attr("data-autocomplete-value", response.highlighting[item].label_autosuggest[0].replace('<b>', '').replace('</b>', '') + ' - ' + item);

                //console.log($(li).data('label'))

                ul.appendChild(li);
                li = domCreate("li");
            }
            catch (err) {
                console.log(err);
                li = domCreate("li");
            }
        }
        if (result.hasChildNodes()) {
            result.childNodes[0].remove();
        }

        result.appendChild(ul);
    }

}//end of function

function isInArray(value, array) {
    //checks if a value is in array
    return array.indexOf(value) > -1;
}

function get_attributes_outer_div() {
    //used in rendering table information

    var ctrlsDiv = $('<div/>',
        {
            class: "copo-component-attributes-outer"
        });

    return ctrlsDiv.clone();
}


function get_attributes_inner_div() {
    //used in rendering table information

    var ctrlSpan = $('<span/>',
        {
            class: "copo-component-attributes-inner"
        });

    return ctrlSpan.clone();
}

function get_attributes_inner_div_1() {
    //used in rendering table information

    var ctrlSpan = $('<span/>',
        {
            class: "copo-component-attributes-inner-0"
        });

    return ctrlSpan.clone();
}


function get_data_list_panel(itemData, link) {
    if (!itemData) {
        return "";
    }

    var containerFuild = $('<div/>', {
        class: "container-fluid",
    });

    var containerRow = $('<div/>', {
        class: "row",
        style: "padding:1px;"
    });

    var containerColumn = $('<div/>', {
        class: "col-sm-12 col-md-12 col-lg-12",
        style: "padding:1px;"
    });

    var mainMenuDiv = $('<div/>', {
        id: "mainMenu_" + link,
    });

    var listGroupPanel = $('<div/>', {
        class: "list-group panel",
        style: "margin-bottom: 0px; border: 0 solid transparent;"
    });

    var topLevelLink = $('<a></a>')
        .attr({
            "href": "#demo3",
            "class": "list-group-item",
            "data-toggle": "collapse",
            "data-parent": "#MainMenu",
            "style": "background: #ebf0fa;"
        });


    var topLevelDiv = $('<div/>', {
        class: "collapse"
    });


    var subMenuLink = $('<a/>', {
        href: "#",
        class: "list-group-item",
        click: function (event) {
            event.preventDefault();
            return false;
        }
    });


    if (Object.prototype.toString.call(itemData) === '[object Array]') {
        $.each(itemData, function (key, val) {
            if (Object.prototype.toString.call(val) === '[object String]') {
                var ctrlElem = subMenuLink.clone();
                ctrlElem.html(val);
                listGroupPanel.append(ctrlElem);
            } else if (Object.prototype.toString.call(val) === '[object Array]') {
                var ctrlElemLink = topLevelLink.clone();
                ctrlElemLink.attr("href", "#rec_" + link + "_" + key);
                ctrlElemLink.html('<span>Item ' + (key + 1) + '</span><i class="fa fa-caret-down pull-right"></i>');

                listGroupPanel.append(ctrlElemLink);

                var ctrlElemDiv = topLevelDiv.clone();
                ctrlElemDiv.attr("id", "rec_" + link + "_" + key);
                ctrlElemDiv.attr("class", "collapse");

                $.each(val, function (key2, val2) {
                    var spl = [];
                    var displayedValue = "";
                    var ctrlElemSubLink = subMenuLink.clone();
                    if (Object.prototype.toString.call(val2) === '[object String]') {
                        displayedValue = val2;
                    } else if (Object.prototype.toString.call(val2) === '[object Array]') {
                        $.each(val2, function (key22, val22) {
                            spl.push(val22);
                        });
                        displayedValue = spl.join("<br/>");

                        if (key2 == 0) {
                            ctrlElemLink.find("span").html(displayedValue);
                            displayedValue = "";
                        }
                    } else if (Object.prototype.toString.call(val2) === '[object Object]') {
                        Object.keys(val2).forEach(function (k2) {
                            spl.push(k2 + ": " + val2[k2]);
                        });

                        displayedValue = spl.join("<br/>");

                        if (key2 == 0) {
                            ctrlElemLink.find("span").html(displayedValue);
                            displayedValue = "";
                        }
                    }

                    if (displayedValue) {
                        ctrlElemSubLink.html(displayedValue);
                        ctrlElemDiv.append(ctrlElemSubLink);
                    }

                });


                listGroupPanel.append(ctrlElemDiv);

            } else if (Object.prototype.toString.call(val) === '[object Object]') {
            }
        });

    } else if (Object.prototype.toString.call(itemData) === '[object Object]') {
        //not an array-type object
        $.each(itemData, function (key, val) {
            var ctrlElem = subMenuLink.clone();
            ctrlElem.html(key + ": " + val);

            listGroupPanel.append(ctrlElem);
        });
    }


    containerColumn.append(mainMenuDiv.append(listGroupPanel));
    containerRow.append(containerColumn);
    containerFuild.append(containerRow);


    return $('<div/>').append(containerFuild).html();
}

function get_data_item_collapse(link, itemData, itemCount) {
    // create badge
    var badgeSpan = $('<span/>',
        {
            class: "badge",
            style: "background: #fff;  border-radius: 5px; margin-left: 2px; margin-bottom: 1px;",
            html: itemCount
        });

    //create button
    var itemsLanguage = "items";
    if (itemCount == 1) {
        itemsLanguage = "item";
    }
    var collapseBtn = $('<a></a>')
        .attr({
            "class": "btn btn-xs btn-info",
            "data-toggle": "collapse",
            "data-target": "#" + link,
            "style": "margin-left:1px; margin-bottom:0px; border-radius:0; background-image:none; border-color:transparent; ",
            "type": "button",
        })
        .html($('<div/>').append(badgeSpan).html() + '<span style="margin-left: 2px; margin-bottom:0px;"> ' + itemsLanguage + '</span>');

    var collapseDiv = $('<div>',
        {
            id: link,
            class: "collapse",
            html: itemData
        });

    var ctrlDiv = $('<div/>')
        .append(collapseBtn)
        .append(collapseDiv);


    return ctrlDiv.html();
}

function get_components_properties() {
    var componentProperties = [
        {
            component: 'datafile',
            title: 'Datafiles',
            addLi: [], //specifies what navbar item (e.g. profile dropdown, add component) are displayed on the page
            addLabel: "Upload Datafile",
            iconClass: "fa fa-database",
            countsKey: "num_data",
            actions: ["inspect"], //specifies what action buttons are displayed alongside the component on the profile page
            colorClass: "data_color" //specifies the color

        },
        {
            component: 'sample',
            title: 'Samples',
            addLi: [],
            addLabel: "Add Sample",
            iconClass: "fa fa-filter copo-icon-success",
            countsKey: "num_sample",
            actions: ["inspect"],
            colorClass: "samples_color"
        },
        {
            component: 'submission',
            title: 'Submissions',
            addLi: [],
            addLabel: "New Submission",
            iconClass: "fa fa-envelope copo-icon-warning",
            countsKey: "num_submission",
            actions: ["inspect"],
            colorClass: "submissions_color"
        },
        {
            component: 'publication',
            title: 'Publications',
            addLi: ["publication", "loader"], //add relevant li item for the component
            addLabel: "Add Publication",
            iconClass: "fa fa-paperclip copo-icon-primary",
            countsKey: "num_pub",
            actions: ["inspect", "add"],
            colorClass: "pubs_color"
        },
        {
            component: 'person',
            title: 'People',
            addLi: ["simple"], //relevant add related li item for the component
            addLabel: "Add Person",
            iconClass: "fa fa-users copo-icon-default",
            countsKey: "num_person",
            actions: ["inspect", "add"],
            colorClass: "people_color"
        },
        {
            component: 'annotation',
            title: 'Annotations',
            addLi: ["simple"], //relevant add related li item for the component
            addLabel: "Add Annotation",
            iconClass: "fa fa-users copo-icon-default",
            countsKey: "num_annotation",
            actions: ["inspect"],
            colorClass: "annotations_color"
        }
    ];

    return componentProperties
}

function do_component_navbar(component) {
    if (component == null) {
        return false;
    }

    var componentProperties = get_components_properties();

    var result = $.grep(componentProperties, function (e) {
        return e.component == component;
    });

    if (result.length) {
        //page title
        $("#copo_components_navs").find(".page-title-custom").html(result[0].title);

        //set 'add' menu
        //...first remove non-relevant list items
        $("#copo_components_navs").find(".nav-page-menu").find(".data-record-add-li").each(function () {
            if ($.inArray($(this).attr("data-add-li"), result[0].addLi) == -1) {
                $(this).remove();
            }
        });

        //check for and set label for add menu
        if ($("#copo_components_navs").find(".nav-page-menu").find(".component-add-label").length) {
            $("#copo_components_navs").find(".nav-page-menu").find(".component-add-label").find(".icon_text").html(result[0].addLabel);
        }

        //set data component for new form call
        if ($("#copo_components_navs").find(".nav-page-menu").find(".new-form-call").length) {
            $("#copo_components_navs").find(".nav-page-menu").find(".new-form-call").attr("data-component", component);
        }

        //set profile menu
        $("#copo_components_navs").find(".profile-menu").find("[data-component='" + component + "']").addClass("disabled");
    }
} //end of func




