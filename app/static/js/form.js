"use strict";

$(function(){
	var formHasChanged   = false;
	var formLevelTooHigh = false;
	var components       = formComponents;
	var componentCount   = 0;

	// TODO: JS callback pasta needs documentation

	/**
	 * Get the amount of components in a component tree by looping through sections recursively.
	 *
	 * @param componentList an array of components
	 * @param callback called with (err, count)
	 */
	function getComponentCount(componentList, callback){
		var count = 0;

		async.each(componentList, function(item, f_callback){
			if(item.type === 'section'){
				count++;
				getComponentCount(item.children, function(err, childrenCount){
					count += childrenCount;
					f_callback();
				});
			}else{
				count++;
				f_callback();
			}
		}, function(err){
			callback(err, count);
		});
	};

	/**
	 * Update the loading progressbar with a fraction.
	 *
	 * @param fraction a floating point number (0.0 - 1.0) indicating progress
	 */
	function setProgress(fraction){
		if(fraction > 1)
			fraction = 100;
		else if(fraction < 0)
			fraction = 0;

		var progressbar = $('#progressbar');
		progressbar.removeClass('indeterminate');
		progressbar.css('width', (fraction * 100) + '%');
	}


	/**
	 * Resets an input, select or checkbox group to its default value.
	 *
	 * @param input the element to reset
	 */
	function resetInput(input){
		var buttonSet = $('.buttonset[data-for="'+ $(input).attr('id') +'"]');
		//var row = $(input).parents('.row');
		//input.val(row.data('default'));
		input.val(input.data('default'));

		if(input.is('input[type="text"]')){
			input.val(input.data('default'));
		}else if(input.is('select')){
			input.val(input.data('default'));
		}else if(input.is('.checkgroup')){
			// Now let's just hope the default value doesn't contain double quotes...
			input.find('input[type="radio"][value="' + input.data('default') + '"]').prop('checked', true);
		}

		$(buttonSet).find('i.reset').addClass('invisible');
	}

	/**
	 * Event handler for reset buttons.
	 *
	 * @param e a click event
	 */
	function onResetButton(e){
		var buttonSet = $(this).parent('.buttonset');
		var input = $('#'+buttonSet.data('for'));
		resetInput(input);

		e.preventDefault();
		e.stopPropagation();
	}


	// HTML generators, templates {{{

	/**
	 * Render repeat label and reset, add, remove buttons for a form component.
	 *
	 * @param component a section or parameter form component
	 * @param repeatIndex an index number if this is not the first element of a repeated component
	 *
	 * @return a jQuery selector thingy containing a buttonSet div
	 */
	function makeButtonSet(component, repeatIndex){
		if(component.type === 'section'){
			var buttonSet = $('<div class="buttonset section-buttons float-right">');
		}else if(component.type === 'parameter'){
			var buttonSet = $('<div class="buttonset parameter-buttons table-cell shrink">');
		}else{
			alert('Error: Cannot render buttonSet for component type "' + component.type + '"');
			return;
		}

		if(component.type === 'section'){
			var minusButton = $('<i title="Remove this block" class="minus fa fa-fw fa-minus">')
			var plusButton  = $('<i title="Add a block of this type" class="plus fa fa-fw fa-plus">')
		}else{
			var minusButton = $('<i title="Remove this value" class="minus fa fa-fw fa-minus">')
			var plusButton  = $('<i title="Add a value" class="plus  fa fa-fw fa-plus">')
		}

		// Check whether we need to make repeat buttons invisible.
		if(component.repeat){
			if(typeof(repeatIndex) === 'undefined')
				repeatIndex = 0

			if(component.repeat_min === component.repeat_max){
				plusButton.addClass('invisible');
			}

			// We show the minimum amount of parameters / section allowed,
			// we can hide the remove button by default.
			minusButton.addClass('invisible');
		}else{
			minusButton.addClass('invisible');
			plusButton.addClass('invisible');
		}

		if(component.type === 'parameter'){
			var resetButton = $('<i title="Reset to default value (' + component.default + ')" class="reset fa fa-fw fa-undo">')
			// New parameters or parameter values will always have the default value, hide the reset button
			resetButton.addClass('invisible');
			resetButton.click(onResetButton);
			buttonSet.append(resetButton);
		}

		if(component.repeat)
			buttonSet.data('for', 'f_' + component.name + '_' + repeatIndex);
		else
			buttonSet.data('for', 'f_' + component.name);

		// We need this to allow [data-X="Y"] selectors to work
		buttonSet.attr('data-for', buttonSet.data('for'));

		buttonSet.append(minusButton);
		buttonSet.append(plusButton);

		return buttonSet;
	}

	/**
	 * Create a section component.
	 *
	 * @param the section component to build
	 *
	 * @return a section element
	 */
	function makeSection(component){
		var section = $('<section>');
		var header  = $('<header>');

		header.append($('<i class="togglebutton fa fa-fw fa-lg fa-angle-double-down">'))
		      .append($('<span class="header-text">').html(component.label))
		      .append(makeButtonSet(component));

		var content   = $('<div class="content">');

		section.append(header)
		       .append(content);

		header.click(function(e){
			toggleSection(section);
		});

		return section;
	}

	/**
	 * Create a value (input, select, checkbox group) for a parameter component.
	 *
	 * @param component the parameter component
	 * @param repeatIndex an optional index number for repeated parameters
	 *
	 * @return a value element
	 */
	function makeValue(component, repeatIndex){
		var name = component.name;
		if(typeof(repeatIndex) !== 'undefined'){
			name += '_' + repeatIndex;
		}
		var id = 'f_' + name;

		if(component.datatype === 'choice' && component.options.length > 999){
			// Special case for radio buttons
			// TODO
			var input = $('<div class="checkgroup table-cell" />');
			input.attr('id', id);

			// List all the options
			for(var i=0; i<component.options.length; i++){
				var checkbox = $('<input type="radio" class="parameter" />');
				checkbox.attr('id', id + '_' + i);
				checkbox.attr('name', name);
				checkbox.prop('checked', component.default === component.options[i]);

				var label = $('<label>');
				label.attr('for', id + '_' + i);
				label.html(component.options[i]);

				input.append(checkbox);
				input.append(label);
			}
		}else{
			if(component.datatype === 'choice'){
				var input = $('<select class="parameter table-cell" />');
				// Select options
				for(var i=0; i<component.options.length; i++){
					var option = $('<option>');
					option.attr('value', component.options[i]);
					option.html(component.options[i]);
					input.append(option);
				}
			}else if(component.datatype === 'string'){
				var input = $('<input type="text" />');
			}else if(component.datatype === 'integer'){
				var input = $('<input type="text" pattern="\d*" />');
			}else if(component.datatype === 'float'){
				var input = $('<input type="text" pattern="\d*(\.\d+)?" />');
			}else if(component.datatype === 'file'){
				var input = $('<input type="file" />');
			}else{
				alert('Error: Unknown datatype "' + component.datatype + '"');
				return;
			}

			input.attr('name', name);

			if(component.datatype !== 'file') // and not a radio button group
				input.val(component.default);

			input.change(function(e){
				formHasChanged = true;

				if($(this).is('input') || $(this).is('select')){
					var buttonSet = $('.buttonset[data-for="'+ $(this).attr('id') +'"]');
					if($(this).val() == $(this).data('default')){
						buttonSet.find('.reset').addClass('invisible');
					}else{
						buttonSet.find('.reset').removeClass('invisible');
					}
				}else if($(this).is('.buttongroup')){
					//buttonSet.find('.reset').removeClass('invisible');
				}
			});

			input.attr('id', id);
			input.data('default', component.default);
		}

		return input;
	}

	/**
	 * Create a labeled parameter.
	 *
	 * @param component the parameter component to build
	 *
	 * @return an object containing a label and a value div
	 */
	function makeParameter(component){
		var label = $('<label>');

		label.attr('for',   'f_' + component.name)
		     .attr('title', '(' + component.datatype + ') ' + component.name + ' = ' + component.default)
		     .html(typeof(component.label) === 'undefined' ? component.name : component.label);

		var value    = $('<div class="value table">');
		var valueRow = $('<div class="table-row">');

		if(component.repeat && component.repeat_min == 0){
			// Minimum amount of values is zero, do not render an input
			var input = $('<input type="text" class="table-cell dummy invisible" disabled>');
		}else{
			var input = makeValue(component);
		}

		valueRow.append(input);
		valueRow.append(makeButtonSet(component));

		value.append(valueRow);

		return { 'label': label, 'value': value };
	}

	/**
	 * Create a documentation / standalone paragraph.
	 *
	 * @param component the paragraph component to build
	 *
	 * @return a paragraph element
	 */
	function makeParagraph(component){
		var paragraph = $('<p class="documentation">');
		paragraph.html(component.text);

		return paragraph;
	}

	/**
	 * Asynchronously render a list of components and add them to the specified container.
	 *
	 * @param container
	 * @param componentList
	 * @param callback called when done
	 */
	function renderComponents(container, componentList, callback){
		var componentsRendered = 0;

		async.each(componentList, function(item, f_callback){
			var row = $('<div class="row">');

			if(item.type === 'section'){
				var section = makeSection(item);

				renderComponents(section.find('> .content'), item.children, function(err, childrenRendered){
					componentsRendered += childrenRendered;
				});

				row.append(section);
			}else if(item.type === 'parameter'){
				var parameter = makeParameter(item);
				row.append(parameter.label)
				   .append(parameter.value);
			}else if(item.type === 'paragraph'){
				var paragraph = makeParagraph(item);
				row.append(paragraph);
			}

			container.append(row);

			componentsRendered++;
			setProgress(componentsRendered / componentCount);
			$('#components-loaded').html(componentCount);

			f_callback();
		}, function(err){
			callback(err, componentsRendered);
		});
	}

	// }}}

	/**
	 * Build a form with the specified list of components.
	 *
	 * @param components
	 */
	function buildForm(components){
		console.log('buildForm start');

		async.series([
			function(callback){
				getComponentCount(components, function(err, count){
					componentCount = count;
					$('#components-total').html(componentCount);
					$('#progress-activity').html('Loading form components');
					$('#component-progress').removeClass('hidden');
					setProgress(0);
					callback();
				});
			},
			function(callback){
				renderComponents($('#haddockform > .content'), components, function(){
					callback();
				});
			},
			function(callback){
				// Fold all sections
				//$('#haddockform section').each(function(){ toggleSection(this, true); });
				//setLevel(formLevel, true);
				$('.loading').hide();
				$('#haddockform').removeClass('hidden');

				console.log('buildForm end');
				callback();
			}
		]);
	}

	/**
	 * Change the form level.
	 *
	 * @param name the level name to switch
	 * @param force show/hide components even if we are already on the specified level
	 */
	function setLevel(name, force){
		if(
				$('.levelchooser li.selected')[0] === $('.levelchooser li.level-'+name)[0]
				&& force !== true
			){
			// We are already at the right level
			return;
		}

		if(!formLevelTooHigh && formLevels.indexOf(name) < formLevelIndex && formHasChanged){
			// Because lower form levels hide certain fields, the user may lose
			// filled in data by switching to a lower form level.
			// Although we do not reset input fields, we should warn the user
			// that some parameters may not be saved.
			// Of course, we filter submitted fields based on access level on the server side as well.
			if(!confirm(
					'You may lose filled in parameters by switching to a lower form level.'
					+ "\nAre you sure you want to switch to the " + name + ' form?'
				)){
				return;
			}
		}

		$('.levelchooser li.selected').removeClass('selected');
		$('.levelchooser li.level-'+name).addClass('selected');

		formLevelIndex = formLevels.indexOf(name);

		var rowsToHide = $('#haddockform .row:not([class~="level-' + name + '"]');
		var rowsToShow = $('#haddockform .row.level-' + name);

		if(Config.hideDisabledComponents){
			rowsToHide.hide();
			rowsToShow.show();
		}

		// FIXME: Select elements are not disabled
		//        (Though this is not really a problem, as they _are_ hidden
		//        and we do server-side checks as well)
		rowsToHide.find('> .value input').prop('disabled', true);
		rowsToShow.find('> .value input').prop('disabled', false);

		if(formLevelIndex > userLevel){
			formLevelTooHigh = true;

			$('.levelwarning').html(
				'<p>'
				+ ' <i class="fa fa-warning"></i>'
				+ ' Warning: Because your current access level is not high enough for the ' + name + ' interface,'
				+ ' you will be unable to submit this form.'
				+ ' Please <a href="mailto:/dev/null">request a higher access level</a> or choose a different form level above.'
				+ '</p>'
			);
			$('.levelwarning').slideDown(80);
			$('#haddockform input[type="submit"]').prop('disabled', true);
		}else{
			formLevelTooHigh = false;

			$('.levelwarning').slideUp(80);
			$('#haddockform input[type="submit"]').prop('disabled', false);
		}
	}

	/**
	 * Fold or unfold a section.
	 *
	 * @param section
	 * @param batch if true, do not attempt to animate folding
	 */
	function toggleSection(section, batch){
		var toggleButton = $(section).find('header > .togglebutton')[0];

		if($(section).hasClass('folded')){
			$(toggleButton).removeClass('fa-angle-double-up');
			$(toggleButton).addClass('fa-angle-double-down');
			$(section).removeClass('folded');
			if(batch === true)
				$($(section).find('.content')[0]).show();
			else
				$($(section).find('.content')[0]).slideDown(80);
		}else{
			$(toggleButton).removeClass('fa-angle-double-down');
			$(toggleButton).addClass('fa-angle-double-up');
			$(section).addClass('folded');
			if(batch === true)
				$($(section).find('.content')[0]).hide();
			else
				$($(section).find('.content')[0]).slideUp(80);
		}
	}

	$('.levelchooser li').click(function(e){
		setLevel($(this).data('name'));
	});

	$('#haddockform input[type="text"]').focus(function(e){
		// Automatically select input element contents on focus
		$(this).one('mouseup', function(){
			$(this).select();
			return false;
		})
		$(this).select();
	});

	$('.buttonset i.plus').click(function(e){
		// TODO

		// Stop click events from reaching the header and folding this section
		e.preventDefault();
		e.stopPropagation();
	});

	$('.buttonset i.minus').click(function(e){
		// TODO

		e.preventDefault();
		e.stopPropagation();
	});

	buildForm(formComponents);
});
