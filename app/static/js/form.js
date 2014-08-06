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
 *
 * Use single quotes for strings unless quote escaping hinders readability.
 *
 * Aim for compatibility with Firefox 24+, Chrome 33+, Safari 5.1+ and IE8+.
 * Using jQuery where appropriate, there really shouldn't be any compatibility issues.
 */

/**
 * The execution order of this script is as follows:
 *
 * - Does a localStorage cache entry exist for the form HTML and is it up-to-date?
 *   - Yes:
 *     - Load form HTML into #haddockform > .content
 *   - No:
 *     - Use buildForm() to generate form HTML
 *       - Recursively generate component instances and their HTML
 *         - Render sections with makeSection()
 *           - Render paragraphs with makeParagraph()
 *           - Render parameters with makeParameter()
 *             - Render parameter values with makeValue()
 *     - Load form HTML into #haddockform > .content
 * - finalizeForm()
 *   - Attach event handlers
 *   - Set form level with setLevel() to a predefined value
 *   - Fold sections
 *   - Show the form
 *
 *
 * Further information on how form component objects are used by this script:
 *
 * `components[]` is a tree of components as generated by a CNS parser.
 * All components in this tree have a `type` property.
 * This type must be one of the following:
 * - `section`
 * - `parameter`
 * - `paragraph`
 *
 * Properties of components in this tree are attributes that define data types,
 * component repetition, default values, the required access levels, etc.
 *
 * Sections component objects contain a `children[]` array which can contain
 * child components of any type.
 *
 * On page load, the script goes through the components array and generates two
 * other component lists: `componentData[]` and `componentInstances[]`.
 *
 * `componentData[]` is basically a flat version of the `component[]` list. It is
 * used to provide quick access to a component's information using an index
 * number. Indices are saved in data-data-index attributes on HTML elements.
 *
 * `componentInstances[]` will be filled with instances of components.
 * Component instances contain a reference to a `components[]` object, and
 * depending on the component type:
 * - A reference to a parent instance (and it's repeat index) if this is not a root component
 * - An index in the componentInstances[] array
 * - An index in the component's own instances array
 * - A list of repetitions for this instance, which contains:
 *   (for sections:)
 *   - A list of child component instances
 *   (for parameters:)
 *   - A list of parameter values
 *
 * The original `components[]` objects get an `instances[]` array that points to
 * entries in the `componentInstances[]` array.
 *
 * Instances are occurrences of a component within a parent component, in the
 * sense that repeated parent blocks each have their own child component
 * instances.
 * Repetitions for the component itself do not create separate instances for
 * that component, repetition data is instead saved in the `repetitions[]`
 * property.
 *
 * During instance generation, a HTML string is generated for the initial form.
 * When all initial instances have been created, this HTML string is inserted
 * into the form container (`#haddockform > .content`).
 * At this point, event handlers can be attached to the form.
 *
 * The initial HTML as generated above is also stored in localStorage, to allow
 * clients to skip the rendering step after the first time (but of course,
 * changes to the data model will be detected and will trigger a regeneration).
 */

$(function(){
	// Note that the members of components as provided by the webserver follow
	// a lowercase/underscore naming convention.
	var components         = formComponents;
	var componentData      = []; // Flat version of components[].
	var componentInstances = []; // Actual spawned sections and parameters, flat list
	var rootInstances      = []; // Component instances at the root level (for tree-structure looping)

	var componentCount         = 0;
	var componentInstanceCount = 0;
	var instancesRendered      = 0;

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

	/**
	 * Replace occurrences of repetition index number placeholders with
	 * the instance's and their parents' repeat indices.
	 *
	 * @param string the string to replace occurrences in
	 * @param instance
	 * @param repeatIndex
	 * @param zeroBased (optional) if true, start counting at 0 instead of 1
	 *
	 * @return the modified string
	 */
	function replaceRepetitionPlaceholders(string, instance, repeatIndex, zeroBased){
		/**
		 * Get a list of placeholders and their values for this instance / repetition and its parents.
		 *
		 * @param instance
		 * @param repeatIndex
		 *
		 * @return a list of {placeholder: <>, value: <>}, ordered from outermost to innermost component
		 */
		function getPlaceholders(instance, repeatIndex){
			var placeholders = [];

			if('parentInstance' in instance && instance.parentInstance !== null)
				placeholders = getPlaceholders(instance.parentInstance, instance.parentRepetition);

			if(instance.component.repeat){
				// The repeat_index component property was not named very well.
				// It contains the placeholder string for repeatable components
				// (that should be replaced with a repeatIndex value).
				placeholders.unshift({
					placeholder: instance.component.repeat_index,
					value:       repeatIndex + (typeof(zeroBased) !== 'undefined' && zeroBased === true ? 0 : 1)
				});
			}
			return placeholders;
		}

		var placeholders = getPlaceholders(instance, repeatIndex);

		for(var i=0; i<placeholders.length; i++)
			string = string.replace(placeholders[i].placeholder, placeholders[i].value);

		return string;
	}

	/**
	 * Render repeat label and reset, add, remove buttons for a form component.
	 *
	 * @param instance a section or parameter instance
	 * @param repeatIndex an index number for repeated components, -1 if this is a dummy section / value
	 *
	 * @return a buttonSet div
	 */
	function makeButtonSet(instance, repeatIndex){
		if(typeof(repeatIndex) === 'undefined')
			repeatIndex = 0

		var buttonSet = '<div class="buttonset ' + instance.component.type + '-buttons'
			+ (instance.component.type === 'parameter' ? ' table-cell shrink' : ' float-right') + '"'
			+ ' data-data-index="'     + instance.component.dataIndex + '"'
			+ ' data-instance-index="' + instance.globalIndex         + '"'
			+ ' data-repetition="'     + repeatIndex                  + '">';

		if(instance.component.repeat){
			if(repeatIndex === -1){
				// Dummy instance
				buttonSet += '(none - click to add)';
			}else{
				buttonSet += (repeatIndex + 1) + ' / ' + instance.repetitionCount;
			}
		}

		if(instance.component.type === 'parameter'){
			buttonSet += '<i title="Reset to default value (' + instance.component.default
				+ ')" class="reset fa fa-fw fa-undo invisible"></i>';
		}

		buttonSet += '<i title="Remove this ' + (instance.component.type === 'section' ? 'block' : 'value') + '" '
			+ 'class="minus fa fa-fw fa-minus invisible"></i>';
		buttonSet += '<i title="Add a ' + (instance.component.type === 'section' ? 'block' : 'value') + '" '
			+ 'class="plus fa fa-fw fa-plus'
			+ (!instance.component.repeat || (instance.component.repeat_max !== null &&
					instance.repetitionCount >= instance.component.repeat_max)
				? ' invisible' : '')
			+ '"></i>';

		buttonSet += '</div>';

		return buttonSet;
	}

	/**
	 * Create the HTML for a single section component repetition.
	 *
	 * @param instance the section instance to build
	 * @param repeatIndex an index number for repeated sections, -1 to render a dummy section
	 *
	 * @return { start: <startHTML>, end: <endHTML> }
	 */
	function makeSectionHTML(instance, repeatIndex){
		var sectionStart =
			  '<section' + (repeatIndex === -1 ? ' class="dummy"' : '')
			+ (repeatIndex !== -1 ? ' data-repeat-index="' + repeatIndex + '"' : '')
			+ '>'
			+ '<header>'
			+ '<i class="togglebutton fa fa-fw fa-lg fa-angle-double-down"></i>'
			+ '<span class="header-text">'
			+ replaceRepetitionPlaceholders(instance.component.label, instance, repeatIndex)
			+ '</span>'
			+ makeButtonSet(instance, repeatIndex)
			+ '</header>'
			+ '<div class="content">';

		var sectionEnd =
			  '</div>'
			+ '</section>';

		return { start: sectionStart, end: sectionEnd };
	}

	/**
	 * Make repeat_min amount of sections, or 1 if repeat is not set.
	 *
	 * @param instance
	 * @param callback called with an array of repetitions, each having a html {start: S, end: S} property
	 */
	function makeSection(instance, callback){
		var repetitions = [];

		async.timesSeries(instance.component.repeat ? instance.component.repeat_min : 1, function(i, timesCallback){
			var repetition = {
				html: null,
				children: []
			};

			repetition.html = makeSectionHTML(instance, i);

			repetitions.push(repetition);

			async.nextTick(timesCallback);
		}, function(){
			async.nextTick(function(){ callback(repetitions); });
		});
	}

	/**
	 * Create a value (input, select, checkbox group) for a parameter component.
	 *
	 * @param instance the parameter instance
	 * @param repeatIndex an index number for repeated parameters, -1 to render a dummy input
	 *
	 * @return a value element
	 */
	function makeValue(instance, repeatIndex){
		var value = '<div class="value table"><div class="table-row">';

		var name = instance.component.name;
		/**
		 * Convenience function, @see replaceRepetitionPlaceholders()
		 *
		 * @param string
		 * @param zeroBased
		 *
		 * @return string
		 */
		function pfilter(string, zeroBased){
			return replaceRepetitionPlaceholders(string, instance, repeatIndex, zeroBased);
		}

		var id = 'f_' + pfilter(name);

		if(repeatIndex === -1){
			var input = '<input type="text" class="table-cell dummy invisible" disabled />';
		}else if(instance.component.datatype === 'choice' && instance.component.options.length > 999){
			// Special case for radio buttons
			// TODO
			var input = '<div class="checkgroup table-cell" id="' + id + '" data-default="' + pfilter(instance.component.default) + '">';

			// List all the options
			optLen = instance.component.options.length;
			for(var i=0; i<optLen; i++){
				var checkbox = '<input type="radio" class="parameter" id="' + id + '_' + i + '" '
					+ 'name="' + pfilter(name) + '"' + (instance.component.default === instance.component.options[i] ? ' checked' : '')
					+ ' />';

				var label = '<label for="' + id + '_' + i + '">' + pfilter(instance.component.options[i]) + '</label>';
				input += label;
			}
		}else{
			var idNameDefaultAttrs = 'id="' + id + '" name="' + pfilter(name) + '" '
				+ 'data-default="' + pfilter(instance.component.default) + '"';

			if(instance.component.datatype === 'choice'){
				var input = '<select class="parameter table-cell" '
					+ idNameDefaultAttrs + '>';
				// Select options
				for(var i=0; i<instance.component.options.length; i++){
					input += '<option value="' + pfilter(instance.component.options[i]) + '"'
						+ (instance.component.default === instance.component.options[i] ? ' selected' : '') + '>'
						+ pfilter(instance.component.options[i]);
				}
				input += '</select>';
			}else if(instance.component.datatype === 'string'){
				var input = '<input type="text" ' + idNameDefaultAttrs + ' value="' + pfilter(instance.component.default) + '" />';
			}else if(instance.component.datatype === 'integer'){
				var input = '<input type="text" pattern="\d*" ' + idNameDefaultAttrs + ' value="' + pfilter(instance.component.default) + '" />';
			}else if(instance.component.datatype === 'float'){
				var input = '<input type="text" pattern="\d*(\.\d+)?" ' + idNameDefaultAttrs + ' value="' + pfilter(instance.component.default) + '" />';
			}else if(instance.component.datatype === 'file'){
				var input = '<input type="file" ' + idNameDefaultAttrs + ' />';
			}else{
				alert('Error: Unknown datatype "' + instance.component.datatype + '"');
				return;
			}
		}

		value += input;
		value += makeButtonSet(instance);
		value += '</div></div>';

		return value;
	}

	/**
	 * Create a labeled parameter.
	 *
	 * @param instance the parameter instance to build
	 *
	 * @return an object containing a label and a value div
	 */
	function makeParameter(instance){
		var label = '<label for="f_'
			+ replaceRepetitionPlaceholders(instance.component.name, instance, 0)
			+ '" title="'
			+ '(' + instance.component.datatype + ') '
			+ replaceRepetitionPlaceholders(instance.component.name, instance, 0)
			+ ' = ' + instance.component.default + '">'
			+ (typeof(instance.component.label) === 'undefined'
				? replaceRepetitionPlaceholders(instance.component.name, instance, 0)
				: replaceRepetitionPlaceholders(instance.component.label, instance, 0)) + '</label>';

		if(instance.component.repeat && instance.component.repeat_min == 0){
			// Minimum amount of values is zero, do not render an input
			var value = makeValue(instance, -1);
		}else{
			// TODO: Do something about repetitions here
			var value = makeValue(instance, 0);
		}

		return { 'label': label, 'value': value };
	}

	/**
	 * Create a documentation / standalone paragraph.
	 *
	 * @param instance the paragraph instance to build
	 *
	 * @return a paragraph element
	 */
	function makeParagraph(instance){
		var paragraph = '<p class="documentation">'
			+ replaceRepetitionPlaceholders(instance.component.text, instance, 0);
			+ '</p>';

		return paragraph;
	}

	/**
	 * Counts components.
	 * Fills componentData[].
	 * Adds instance arrays to components.
	 *
	 * @param components
	 * @param callback
	 */
	function prepareComponents(components, callback){
		async.each(components, function(component, componentCallback){
			if('hidden' in component && component.hidden){
				async.nextTick(componentCallback);
				return;
			}
			componentCount++;
			var dataIndex       = componentData.push(component) - 1;
			component.dataIndex = dataIndex;
			component.instances = [];

			if(component.type === 'section'){
				prepareComponents(component.children, function(){
					async.nextTick(componentCallback);
				});
			}else{
				async.nextTick(componentCallback);
			}
		}, function(){
			async.nextTick(callback);
		});
	}

	/**
	 * Fills componentInstances[].
	 * Renders component instances.
	 *
	 * @param components
	 * @param callback called with the generated HTML string
	 */
	function renderComponents(components, callback, parentInstance, parentRepetition){
		var html = '';

		async.eachSeries(components, function(component, componentCallback){
			if('hidden' in component && component.hidden){
				async.nextTick(componentCallback);
				return;
			}

			var isRootComponent = (typeof(parentInstance) === 'undefined' || parentInstance === null);

			var instance = {
				component:        component,
				parentInstance:   isRootComponent ? null : parentInstance,
				parentRepetition: isRootComponent ? null : parentRepetition,
				hasDummy:         false
			};

			console.log(component);

			instance.globalIndex = componentInstances.push(instance);
			instance.localIndex  = component.instances.push(instance);

			if(isRootComponent){
				rootInstances.push(instance);
			}else{
				parentInstance.repetitions[parentRepetition].children.push(instance);
			}

			html += '<div class="row';
			if('accesslevels' in component){
				var levelCount = component.accesslevels.length;
				for(var i=0; i<levelCount; i++)
					html += ' level-' + component.accesslevels[i];
			}

			html += '" data-data-index="'            + component.dataIndex;
			html += '" data-global-instance-index="' + instance.globalIndex + '">';

			instance.repetitions     = [];
			instance.repetitionCount = component.repeat_min;

			if(component.type === 'section'){

				if(component.repeat && component.repeat_min == 0){
					instance.hasDummy  = true;
					var dummyHTML = makeSectionHTML(instance, -1);
					dummyHTML     = dummyHTML.start + dummyHTML.end;

					html += dummyHTML;
					async.nextTick(componentCallback);
				}else{
					makeSection(instance, function(repetitions){
						instance.repetitions = repetitions;
						async.timesSeries(instance.repetitions.length, function(i, timesCallback){
							html += repetitions[i].html.start;
							renderComponents(component.children, function(repetitionHTML){
								html += repetitionHTML;
								html += repetitions[i].html.end;
								async.nextTick(timesCallback);
							}, instance, i);
						}, function(){
							html += '</div>';
							async.nextTick(componentCallback);
						});
					});
				}
			}else{
				if(component.type === 'parameter'){
					var parameter = makeParameter(instance);
					html += parameter.label + parameter.value;
				}else if(component.type === 'paragraph'){
					html += makeParagraph(instance);
				}else{
					alert('Error: Can\'t render unknown component type: ' + component.type);
				}

				html += '</div>';
				async.nextTick(componentCallback);
			}
		}, function(){
			async.nextTick(function(){ callback(html); });
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

				$('#haddockform').on('click', 'section:not([class~="dummy"]) header', function(e){
					toggleSection($(this).parent('section'));
				});

				$('#haddockform').on('focus', 'input[type="text"]', function(e){
					// Automatically select input element contents on focus
					$(this).one('mouseup', function(){
						$(this).select();
						return false;
					})
					$(this).select();
				});

				$('#haddockform').on('change', 'input, select', function(e){
					// FIXME: Doesn't work currently
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

				$('#haddockform').on('click', '.buttonset i.reset',  onResetButton);
				$('#haddockform').on('click', '.buttonset i.minus',  onMinusButton);
				$('#haddockform').on('click', '.buttonset i.plus',   onPlusButton );

				$('.levelchooser').on('click', 'li', function(e){
					setLevel($(this).data('name'));
				});

				async.nextTick(callback);
			},
			function(callback){
				// Fold all sections
				$('#haddockform section').each(function(){ toggleSection(this, true); });
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
	 * Build a form with the specified list of components.
	 *
	 * @param components
	 * @param callback called on completion
	 */
	function buildForm(components, callback){
		// We're not hanging your browser, don't worry
		$('html').css('cursor', 'progress');

		var html;

		async.series([
			function(stepCallback){
				prepareComponents(components, function(){
					$('#components-total').html(componentCount);
					async.nextTick(stepCallback);
				});
			},
			function(stepCallback){
				setProgress(0);
				$('#progress-activity').html('Building form');
				$('#component-progress, .progress-container').removeClass('hidden');
				renderComponents(components, function(renderedHTML){
					html = renderedHTML;
					async.nextTick(stepCallback);
				});
			},
			function(stepCallback){
				$('#progress-activity').html('Rendering');
				var progressbar = $('#progressbar');
				progressbar.css('width', '');
				progressbar.addClass('indeterminate');
				$('#component-progress').addClass('hidden');
				async.nextTick(stepCallback);
			},
		], function(err){
			$('html').css('cursor', '');
			async.nextTick(function(){ callback(html); });
		});
	}

	function storeForm(html){
		simpleStorage.deleteKey('haddock_form_version');
		simpleStorage.deleteKey('haddock_form');

		console.log('storing form version: ' + modelVersionTag);
		simpleStorage.set('haddock_form_version', modelVersionTag);
		simpleStorage.set('haddock_form', html);
	}

	/**
	 * Load the HADDOCK form.
	 *
	 * This will load the HTML for the form either by using the localStorage
	 * cache or by generating it on page load using buildForm().
	 *
	 * @param forceRenew when true, no attempt is made to load the form from cache
	 */
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

	async.nextTick(function(){
		// Don't load from localStorage if the query string contains "nocache".
		// Doing an indexOf on the entire query string is a bit hacky,
		// but we do not have any other parameters, so it's OK for now.
		if(window.location.search.indexOf('nocache') === -1)
			loadForm();
		else
			loadForm(true);
	});
});
