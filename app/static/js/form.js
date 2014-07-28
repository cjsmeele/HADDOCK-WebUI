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

	// HTML generators, templates {{{

	/**
	 * Render reset, add, remove buttons for a form component.
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
			var buttonSet = $('<div class="buttonset parameter-buttons float-right">');
		}else{
			//return $('<div class="buttonset float-right">');
			alert('Error: Cannot render buttonSet for component type "' + component.type + '"');
			return;
		}

		if(typeof(repeatIndex) === 'undefined')
			repeatIndex = 0

		var resetButton = $('<i title="Reset to default value (' + component.default + ')" class="reset fa fa-fw fa-undo">')

		buttonSet.append(resetButton);

		return buttonSet;
	}

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

	function makeParameter(component){
		var label = $('<label>');

		label.attr('for',   'f_' + component.name)
		     .attr('title', '(' + component.datatype + ') ' + component.name + ' = ' + component.default)
		     .html(typeof(component.label) === 'undefined' ? component.name : component.label);

		var value    = $('<div class="value table">');
		var valueRow = $('<div class="table-row">');
		valueRow.append(makeButtonSet(component));

		value.append(valueRow);

		return { 'label': label, 'value': value };
	}

	function makeParagraph(component){
		var paragraph = $('<p class="documentation">');
		paragraph.html(component.text);

		return paragraph;
	}

	// }}}

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

	$('#haddockform .parameter:not([type="file"])').change(function(e){
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

	$('#haddockform input[type="text"]').focus(function(e){
		// Automatically select input element contents on focus
		$(this).one('mouseup', function(){
			$(this).select();
			return false;
		})
		$(this).select();
	});

	$('.buttonset i.reset').click(function(e){
		var buttonSet = $(this).parent('.buttonset');
		var input = $('#'+buttonSet.data('for'));

		if(input.is('input[type="text"]')){
			input.val(input.data('default'));
		}else if(input.is('select')){
			input.val(input.data('default'));
		}else if(input.is('.checkgroup')){
			// Now let's just hope the default value doesn't contain double quotes...
			input.find('input[type="radio"][value="' + input.data('default') + '"]').prop('checked', true);
		}

		$(this).addClass('invisible');

		e.preventDefault();
		e.stopPropagation();
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
