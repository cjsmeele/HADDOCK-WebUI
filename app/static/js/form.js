"use strict";

$(function(){
	function setLevel(name){
		$('.levelchooser li.selected').removeClass('selected');
		$('.levelchooser li.level-'+name).addClass('selected');

		formLevel = formLevels.indexOf(name);

		for(var i=0; i<formLevels.length; i++){
			if(i <= formLevel){
				$("form .level-"+formLevels[i]).removeClass('disabled');
				$("form .level-"+formLevels[i]+" input").prop('disabled', false);

				if(Config.hideDisabledComponents)
					$("form .level-"+formLevels[i]).slideDown(120);
			}else{
				$("form .level-"+formLevels[i]).addClass('disabled');
				$("form .level-"+formLevels[i]+" input").prop('disabled', true);

				if(Config.hideDisabledComponents)
					$("form .level-"+formLevels[i]).slideUp(120);
			}
		}
	}

	$('.levelchooser li').click(function(e){
		setLevel($(this).data('name'));
		e.preventDefault();
	});

	setLevel(formLevel);
});
