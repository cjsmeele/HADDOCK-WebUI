"use strict";

/**
 * form.js - HADDOCK form generator
 */

/**
 * Coding style for this script:
 *
 * Write strict-mode compliant JavaScript. See:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode#Changes_in_strict_mode
 *
 * Casing: camelCase  for variables and methods
 *         PascalCase for classes
 *         UPPER_CASE for constants
 *
 * Opening braces:       on the same line
 * Spaces around braces: only for inline functions: `function(){ a=1; }`
 *
 * Indentation: tabs
 * Alignment:   spaces (align assignments, string concats, etc.)
 *
 * Documentation: docblocks before every function
 *
 * Wrapping: recommended but not required, at column 120 or 80
 *           (assume a tab width of 4 characters)
 */

/**
 * Execution order:
 *
 * - loadForm()
 *   - Locally cached form HTML available and up to date?
 *     - Yes:
 *       - Load form HTML from localStorage
 *     - No:
 *       - buildForm()
 *         - renderComponents() (recursively, parallel)
 *           - makeX()
 *         - flattenComponentHTML() (recursively, serial)
 *         - Attach generated HTML to DOM
 *       - storeForm()
 * - finalizeForm()
 *   - Attach event handlers
 *   - setLevel()
 *   - Fold sections
 *   - Show form
 */

$(function(){
	// Note that the members of components as provided by the webserver follow
	// a lowercase/underscore naming convention.
	var components         = formComponents;
	var componentData      = []; // Flat version of components[].
	var componentInstances = []; // Actual spawned sections and parameters
	var componentCount     = 0;
	var componentsRendered = 0;
	var componentsInserted = 0;

	var formHasChanged     = false;
	var formLevelTooHigh   = false;
	var formReady          = false;

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

		if(!formLevelTooHigh && formLevels.indexOf(name) < formLevelIndex && formHasChanged && force !== true){
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

		formHasChanged = false;

		$('.levelchooser li.selected').removeClass('selected');
		$('.levelchooser li.level-'+name).addClass('selected');

		formLevelIndex = formLevels.indexOf(name);

		var rowsToHide = $('#haddockform .row:not([class~="level-' + name + '"])');
		var rowsToShow = $('#haddockform .row.level-' + name);

		if(Config.hideDisabledComponents){
			rowsToHide.hide();
			rowsToShow.show();
		}

		rowsToHide.find('> .value input, > .value select').prop('disabled', true);
		rowsToShow.find('> .value input, > .value select').prop('disabled', false);

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

	/**
	 * Get the amount of components in a component tree by looping through sections recursively.
	 *
	 * @param componentList an array of components
	 * @param callback called with (err, count)
	 */
	function getComponentCount(componentList, callback){
		var count = 0;

		// Loop asynchronously
		async.each(componentList, function(item, f_callback){
			// Reserve a spot in the componentData array
			var dataIndex  = componentData.push(item) - 1;
			item.dataIndex = dataIndex;

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
	}

	/**
	 * Update the loading progressbar with a fraction.
	 *
	 * @param fraction a floating point number (0.0 - 1.0) indicating progress
	 */
	function setProgress(fraction){
		if(fraction > 1)
			fraction = 1;
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
		//input.val(row.attr('data-default'));
		input.val(input.attr('data-default'));

		if(input.is('input[type="text"]')){
			input.val(input.attr('data-default'));
		}else if(input.is('select')){
			input.val(input.attr('data-default'));
		}else if(input.is('.checkgroup')){
			// Now let's just hope the default value doesn't contain double quotes...
			input.find('input[type="radio"][value="' + input.attr('data-default') + '"]').prop('checked', true);
		}

		$(buttonSet).find('i.reset').addClass('invisible');
	}

	// Multi- section/parameter code {{{

	/**
	 * Remove a section
	 *
	 * @param component the section's components / componentData entry
	 * @param repeatIndex
	 */
	function removeSection(component, repeatIndex){
		// TODO
	}

	/**
	 * Remove a parameter value
	 *
	 * @param component the parameter's components / componentData entry
	 * @param repeatIndex
	 */
	function removeParameterValue(component, repeatIndex){
		// TODO
	}

	/**
	 * Add a section (called when a plus button is pressed in a section header)
	 *
	 * @param container a "row" class div
	 * @param component the section's components / componentData entry
	 * @param repeatIndex
	 */
	function addSection(container, component, repeatIndex){
		// TODO: Create section
		// TODO: Attach event handlers
	}

	/**
	 * Add a parameter value (called when a plus button is pressed in a
	 * parameter row).
	 *
	 * @param container a "value" class div
	 * @param component the parameter's components / componentData entry
	 * @param repeatIndex
	 */
	function addParameterValue(container, component, repeatIndex){
		// TODO: Create parameter
		// TODO: Attach event handlers
	}

	// }}}
	// Event handlers {{{

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

	/**
	 * Event handler for minus buttons.
	 *
	 * @param e a click event
	 */
	function onMinusButton(e){
		var buttonSet = $(this).parent('.buttonset');
		removeParameterValue
		// Stop click events from reaching the header and folding this section
		e.preventDefault();
		e.stopPropagation();
	}

	/**
	 * Event handler for plus buttons.
	 *
	 * @param e a click event
	 */
	function onPlusButton(e){
		var buttonSet = $(this).parent('.buttonset');

		e.preventDefault();
		e.stopPropagation();
	}

	// }}}
	// HTML generators, templates {{{

	// NOTE: Using $('<el>') to create elements and el.attr() to assign
	//       attributes would be a lot more readable, but unfortunately this
	//       is a lot slower than generating HTML strings ourselves.
	//       This also means that we need to attach event handlers separately.
	//       We do this in the finalizeForm() function.

	/**
	 * Render repeat label and reset, add, remove buttons for a form component.
	 *
	 * @param component a section or parameter form component
	 * @param repeatIndex an optional index number for repeated components, -1 if this is a dummy section / value
	 *
	 * @return a buttonSet div
	 */
	function makeButtonSet(component, repeatIndex){
		if(typeof(repeatIndex) === 'undefined')
			repeatIndex = 0

		var buttonSet = '<div class="buttonset ' + component.type + '-buttons'
			+ (component.type === 'parameter' ? ' table-cell shrink' : ' float-right') + '"'
			+ ' data-for-data-index="' + component.dataIndex + '" data-for-instance="' + (component.repeat ? repeatIndex : '0') + '">';

		if(component.type === 'parameter'){
			buttonSet += '<i title="Reset to default value (' + component.default
				+ ')" class="reset fa fa-fw fa-undo invisible"></i>';
		}

		buttonSet += '<i title="Remove this ' + (component.type === 'section' ? 'block' : 'value') + '" '
			+ 'class="minus fa fa-fw fa-minus invisible"></i>';
		buttonSet += '<i title="Add a ' + (component.type === 'section' ? 'block' : 'value') + '" '
			+ 'class="plus fa fa-fw fa-plus'
			+ (!component.repeat || (component.repeat_max !== null && component.repeat_max <= repeatIndex) ? ' invisible' : '')
			+ '"></i>';

		buttonSet += '</div>';

		return buttonSet;
	}

	/**
	 * Create a section component.
	 *
	 * @param component the section component to build
	 * @param repeatIndex an optional index number for repeated sections, -1 to render a dummy section
	 *
	 * @return { start: <startHTML>, end: <endHTML> }
	 */
	function makeSection(component, repeatIndex){
		var sectionStart =
			  '<section' + (repeatIndex === -1 ? ' class="dummy"' : '') + '>'
			+ '<header>'
			+ '<i class="togglebutton fa fa-fw fa-lg fa-angle-double-down"></i>'
			+ '<span class="header-text">' + component.label + '</span>'
			+ makeButtonSet(component, repeatIndex)
			+ '</header>'
			+ '<div class="content">';

		var sectionEnd =
			  '</div>'
			+ '</section>';

		return { start: sectionStart, end: sectionEnd };
	}

	/**
	 * Create a value (input, select, checkbox group) for a parameter component.
	 *
	 * @param component the parameter component
	 * @param repeatIndex an optional index number for repeated parameters, -1 to render a dummy input
	 *
	 * @return a value element
	 */
	function makeValue(component, repeatIndex){
		var value = '<div class="value table"><div class="table-row">';

		var name = component.name;
		if(typeof(repeatIndex) !== 'undefined'){
			name += '_' + repeatIndex;
		}
		var id = 'f_' + name;

		if(repeatIndex === -1){
			var input = '<input type="text" class="table-cell dummy invisible" disabled />';
		}else if(component.datatype === 'choice' && component.options.length > 999){
			// Special case for radio buttons
			// TODO
			var input = '<div class="checkgroup table-cell" id="' + id + '" data-default="' + component.default + '">';

			// List all the options
			optLen = component.options.length;
			for(var i=0; i<optLen; i++){
				var checkbox = '<input type="radio" class="parameter" id="' + id + '_' + i + '" '
					+ 'name="' + name + '"' + (component.default === component.options[i] ? ' checked' : '')
					+ ' />';

				var label = '<label for="' + id + '_' + i + '">' + component.options[i] + '</label>';
				input += label;
			}
		}else{
			var idNameDefaultAttrs = 'id="' + id + '" name="' + name + '" ' + 'data-default="' + component.default + '"';

			if(component.datatype === 'choice'){
				var input = '<select class="parameter table-cell" '
					+ idNameDefaultAttrs + '>';
				// Select options
				for(var i=0; i<component.options.length; i++){
					input += '<option value="' + component.options[i] + '"'
						+ (component.default === component.options[i] ? ' selected' : '') + '>'
						+ component.options[i];
				}
				input += '</select>';
			}else if(component.datatype === 'string'){
				var input = '<input type="text" ' + idNameDefaultAttrs + ' value="' + component.default + '" />';
			}else if(component.datatype === 'integer'){
				var input = '<input type="text" pattern="\d*" ' + idNameDefaultAttrs + ' value="' + component.default + '" />';
			}else if(component.datatype === 'float'){
				var input = '<input type="text" pattern="\d*(\.\d+)?" ' + idNameDefaultAttrs + ' value="' + component.default + '" />';
			}else if(component.datatype === 'file'){
				var input = '<input type="file" ' + idNameDefaultAttrs + ' />';
			}else{
				alert('Error: Unknown datatype "' + component.datatype + '"');
				return;
			}
		}

		value += input;
		value += makeButtonSet(component);
		value += '</div></div>';

		return value;
	}

	/**
	 * Create a labeled parameter.
	 *
	 * @param component the parameter component to build
	 *
	 * @return an object containing a label and a value div
	 */
	function makeParameter(component){
		var label = '<label for="f_' + component.name + '" title="'
			+ '(' + component.datatype + ') ' + component.name + ' = ' + component.default + '">'
			+ (typeof(component.label) === 'undefined' ? component.name : component.label) + '</label>';

		if(component.repeat && component.repeat_min == 0){
			// Minimum amount of values is zero, do not render an input
			var value = makeValue(component, -1);
		}else{
			var value = makeValue(component);
		}

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

		var paragraph = '<p class="documentation">' + component.text + '</p>';

		return paragraph;
	}

	/**
	 * Asynchronously and recursively render a list of components.
	 *
	 * Resulting HTML is stored in a component's `html` property. For sections,
	 * `component.html` is an object instead of a string, containing a `start`
	 * and an `end` property to be wrapped around child components.
	 *
	 * @param componentList
	 * @param callback called when done
	 */
	function renderComponents(componentList, callback){
		async.eachLimit(componentList, 8, function(item, f_callback){
			// Instantiate the component
			var instance = {
				proto: item
			};

			var instanceIndex = componentInstances.push(instance);
			item.instances.push(instanceIndex);

			var rowStart = '<div class="row';

			if('accesslevels' in item){
				var levelCount = item.accesslevels.length;
				for(var i=0; i<levelCount; i++)
					rowStart += ' level-' + item.accesslevels[i];
			}

			rowStart  += '" data-data-index="' + item.dataIndex + '" data-instance-index="' + instanceIndex + '">';
			var rowEnd = '</div>';

			if(item.type === 'section'){
				instance.children = [];
				instance.html = {
					start: rowStart,
					end:   rowEnd
				}
				// XXX 20140731

				// For sections we need to handle repetition here.
				if(item.repeat && item.repeat_min <= 0){
					// Render a dummy section
					var section = makeSection(item, -1);
					instance.html = {
						start: rowStart    + section.start,
						end:   section.end + rowEnd
					};

					// Do not render child components
					async.nextTick(f_callback);
				}else{
					var instanceCount = (item.repeat ? item.repeat_min : 1);
					for(var i=0; i<instanceCount; i++){
						var section = makeSection(item, i);

						var instance = {
							html: {
								start: rowStart    + section.start,
								end:   section.end + rowEnd
							}
						};

						// We need to re-render our child components for every section instance
						renderComponents(item.children, function(err){
							item.instances.push(instance);
							async.nextTick(f_callback);
						});
					}
				}

				// Wait for the child renderers to complete
				return;

			}else if(item.type === 'parameter'){
				instance.values = [];
				// Parameter repetition is handled at the value level
				var parameter = makeParameter(item);
				item.html = rowStart + parameter.label + parameter.value + rowEnd;
			}else if(item.type === 'paragraph'){
				var paragraph = makeParagraph(item);
				item.html = rowStart + paragraph + rowEnd;
			}else{
				alert('Unknown component type "' + item.type + '"');
			}

			async.nextTick(f_callback);
		}, function(err){
			callback(err);
		});
	}

	/**
	 * Concatenate the generated HTML of a component tree.
	 *
	 * @param componentList a list of rendered components to insert
	 * @param callback called on completion with the generated HTML as a parameter
	 */
	function flattenComponentHTML(componentList, callback){
		var html = '';

		async.eachSeries(componentList, function(item, f_callback){
			if(typeof(item.html) === 'object'){
				html += item.html.start;

				if(item.type === 'section'){
					flattenComponentHTML(item.children, function(result){
						html += result;
						// Close the section
						html += item.html.end;

						componentsInserted++;
						if(!(componentsInserted & 0x0f) || componentsInserted === componentCount){
							setProgress(componentsInserted / componentCount);
							$('#components-loaded').html(componentsInserted);
						}

						async.nextTick(f_callback);
					});
				}else{
					// This shouldn't happen
					alert('Error: Can\'t flatten HTML object of non-section component.');
				}
				return;

			}else if(typeof(item.html) === 'string'){
				html += item.html;
			}

			componentsInserted++;
			if(!(componentsInserted & 0x0f) || componentsInserted === componentCount){
				setProgress(componentsInserted / componentCount);
				$('#components-loaded').html(componentsInserted);
			}

			async.nextTick(f_callback);
		}, function(err){
			callback(html);
		});
	}

	// }}}

	/**
	 * Attach event handlers.
	 * Basically, adds everything to the form that can't be saved in a cache.
	 *
	 * @param c_callback called on completion
	 */
	function finalizeForm(c_callback){
		async.series([
			function(callback){
				// Attach all event handlers here
				// TODO: Put event handlers in separate functions

				$('#haddockform header').click(function(e){
					toggleSection($(this).parent('section'));
				});

				$('#haddockform input[type="text"]').focus(function(e){
					// Automatically select input element contents on focus
					$(this).one('mouseup', function(){
						$(this).select();
						return false;
					})
					$(this).select();
				});

				$('#haddockform input, #haddockform select').change(function(e){
					formHasChanged = true;

					if($(this).is('input[type="text"]') || $(this).is('select')){
						var buttonSet = $('.buttonset[data-for="'+ $(this).attr('id') +'"]');
						if($(this).val() == $(this).attr('data-default')){
							buttonSet.find('.reset').addClass('invisible');
						}else{
							buttonSet.find('.reset').removeClass('invisible');
						}
					}else if($(this).is('.buttongroup')){
						//buttonSet.find('.reset').removeClass('invisible');
					}
				});

				$('#haddockform .buttonset i.reset').click(onResetButton);

				async.nextTick(callback);
			},
			function(callback){
				// Fold all sections
				//$('#haddockform section').each(function(){ toggleSection(this, true); });
				// Set form level
				setLevel(formLevel, true);
				// Show the form
				$('.loading').addClass('hidden');
				$('#haddockform').removeClass('hidden');
				formReady = true;
				async.nextTick(callback);
			}
		], c_callback);
	}

	/**
	 * Removes hidden components from a copmonent list
	 *
	 * @param componentList
	 * @param callback called when done with a list of filtered components as an argument
	 */
	function deleteHiddenComponents(componentList, callback){
		async.filter(componentList, function(item, f_callback){
			if('hidden' in item && item.hidden){
				async.nextTick(function(){ f_callback(false); });
			}else if(item.type === 'section'){
				deleteHiddenComponents(item['children'], function(filteredComponents){
					// Filter out this section if it has no visible children
					if(filteredComponents.length){
						item['children'] = filteredComponents;
						async.nextTick(function(){ f_callback(true); });
					}else{
						async.nextTick(function(){ f_callback(false); });
					}
				});
			}else{
				async.nextTick(function(){ f_callback(true); });
			}
		}, function(filteredComponents){
			async.nextTick(function(){ callback(filteredComponents); });
			components = filteredComponents;
		});
	}

	/**
	 * Build a form with the specified list of components.
	 *
	 * @param components
	 * @param c_callback called on completion
	 */
	function buildForm(components, c_callback){
		$('html').css('cursor', 'progress');

		var html;

		async.series([
			function(callback){
				deleteHiddenComponents(components, function(filteredComponents){
					components = filteredComponents;
					async.nextTick(callback);
				});
			},
			function(callback){
				getComponentCount(components, function(err, count){
					componentCount = count;
					$('#components-total').html(componentCount);
					setProgress(0);
					async.nextTick(callback);
				});
			},
			function(callback){
				renderComponents(components, function(){
					async.nextTick(callback);
				});
			},
			function(callback){
				setProgress(0);
				$('#progress-activity').html('Building form');
				$('#component-progress, .progress-container').removeClass('hidden');

				flattenComponentHTML(components, function(result){
					html = result;
					$('#progress-activity').html('Rendering');
					var progressbar = $('#progressbar');
					progressbar.css('width', '');
					progressbar.addClass('indeterminate');
					$('#component-progress').addClass('hidden');
					async.nextTick(callback);
				});
			},
		], function(err){
			$('html').css('cursor', '');
			async.nextTick(function(){ c_callback(html); });
		});
	}

	function storeForm(html){
		simpleStorage.deleteKey('haddock_form_version');
		simpleStorage.deleteKey('haddock_form');

		console.log('storing form version: ' + modelVersionTag);
		simpleStorage.set('haddock_form_version', modelVersionTag);
		simpleStorage.set('haddock_form', html);
	}

	function loadForm(forceRenew){
		var storedVersion = simpleStorage.get('haddock_form_version');
		if(typeof(forceRenew) !== 'undefined' && forceRenew){
			console.log('force-refreshing form, dropping html cache');
		}else if(storedVersion === modelVersionTag){
			console.log('stored form html version ' + storedVersion + ' is up to date');
			var form = simpleStorage.get('haddock_form');
		}else if(typeof(storedVersion) !== 'undefined'
				&& storedVersion !== null
				&& storedVersion !== false
				&& storedVersion.length){
			// If only there were a cross-browser method of checking whether a localStorage key exists
			console.log('stored form html version ' + storedVersion + ' is out of date, generating new version '
				+ modelVersionTag);
		}else{
			console.log('no valid form cache found, generating new form version ' + modelVersionTag);
		}

		if(typeof(form) === 'undefined' || form === null || form === false || !form.length){
			async.waterfall([
				function(callback){
					buildForm(formComponents, function(result){ callback(null, result); });
				},
				function(result, callback){
					// Note: [0].innerHTML should be faster than html() but the
					//       difference is barely noticable in FF, Chrome and Safari.
					//       Also, cross-browser compatibility would not be guaranteed.
					$('#haddockform > .content').html(result);
					storeForm(result);
					finalizeForm();
				}
			]);
		}else{
			$('#haddockform > .content').html(form);
			finalizeForm();
		}
	}

	$('.levelchooser li').click(function(e){
		// TODO: Enable after form loading
		setLevel($(this).data('name'));
	});

	async.nextTick(function(){
		// Don't load from localStorage cache if the query string contains "nocache".
		// Note: Doing an indexOf on the entire query string is a bit hacky,
		//       but we do not have any other parameters, so it's OK for now.
		if(window.location.search.indexOf('nocache') === -1)
			loadForm();
		else
			loadForm(true);
	});
});
