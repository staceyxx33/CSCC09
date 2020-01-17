(function(){
    "use strict";
        
    window.addEventListener('load', function(){
        
        api.onItemUpdate(function(items){
            document.querySelector('#items').innerHTML = '';
            items.forEach(function(item){
                let element = document.createElement('div');
                element.className = "item";
                element.innerHTML = `
                    <div class="item_content">${item.content}</div>
                    <div class="delete-icon icon"></div>
                `;
                  element.querySelector('.delete-icon').addEventListener('click', function(e){
                    api.deleteItem(item.id);
                }); 
                document.querySelector('#items').prepend(element);
            });
        });
        
        document.querySelector('#add_item').addEventListener('submit', function(e){
            e.preventDefault();
            let content = document.querySelector('#content_form').value;
            document.querySelector('#add_item').reset();
            api.addItem(content);
        });
    });
    
}());



