from django import forms
from django.http import HttpResponse
from django.shortcuts import render
import markdown2
from . import util
import re 
import random


class NewEntryForm(forms.Form): 
    title = forms.CharField(widget=forms.TextInput(attrs={"placeholder": "Title...",
                                                          "class": "title-input"}))
    contents = forms.CharField(widget=forms.Textarea(attrs={
                                         "rows": 2, 
                                         "cols": 10, 
                                         "placeholder": "Contents...",
                                         "class": "textarea-small"
                                     }))
    
class EditEntryForm(forms.Form):
    contents = forms.CharField(widget=forms.Textarea(attrs={"rows": 2,
                                                            "cols": 10,  
                                                            "class": "textarea-small"}))
    def __init__(self, title, *args, **kwargs):
        entry = util.get_entry(title)
        initial_text = util.remove_header(entry, title)
        super().__init__(*args, **kwargs)

        self.fields["contents"].initial = initial_text


def index(request):
    return render(request, "encyclopedia/index.html", {
        "entries": util.list_entries()
    }) 


def entry(request, title): 
    entry = util.get_entry(title)
    if entry:
        return render(request, "encyclopedia/entry.html", {
            "title": title, 
            "entry": markdown2.markdown(entry)
        })
    else: 
        return render(request, "encyclopedia/error.html") 
    

def search(request): 
    search_input = request.GET.get("q")
    entry = util.get_entry(search_input.capitalize()) 
    if entry: 
        return render(request, "encyclopedia/entry.html", {
            "title": search_input, 
            "entry": markdown2.markdown(entry)
        }) 
    else: 
        entries = util.list_entries()
        search_output = []
        
        for entry in entries: 
            if re.search(search_input.lower(), entry.lower()):
                search_output.append(entry)
        if len(search_output) == 0: 
            return render(request, "encyclopedia/error.html")
        return render(request, "encyclopedia/search_results.html", {
            "search": search_input, 
            "results": search_output
        })


def create(request): 
    if request.method == "POST": 
        form = NewEntryForm(request.POST)

        if form.is_valid(): 
            title = form.cleaned_data["title"]
            contents = form.cleaned_data["contents"]
            if util.get_entry(title): 
                return HttpResponse("Error: Entry title already exists")
            else:
                util.save_entry(title, contents)
                return render(request, "encyclopedia/entry.html", {
                    "title": title, 
                    "entry": markdown2.markdown(contents)
                })
        return HttpResponse("Error: Invalid user input")
    return render(request, "encyclopedia/create.html", {
        "form": NewEntryForm
    }) 


def edit(request, title): 
    if request.method == "POST": 
        form = EditEntryForm(title, request.POST) 
        if form.is_valid(): 
            contents = f"# {title}\n" + form.cleaned_data["contents"]
            util.save_entry(title, contents)
            
            return render(request, "encyclopedia/entry.html", {
                "title": title,
                "entry": markdown2.markdown(contents)
            })
        
    entry = util.get_entry(title) 
    if entry: 
        return render(request, "encyclopedia/edit.html", {
            "title": title,
            "form": EditEntryForm(title)
        })
    else: 
        return HttpResponse("Error: Invalid entry")


def random_entry(request): 
    entries = util.list_entries()
    r = random.randint(0, len(entries) - 1)
    title = entries[r]
    return render(request, "encyclopedia/entry.html", {
        "title": title,
        "entry": markdown2.markdown(util.get_entry(title))
    })




