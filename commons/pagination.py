from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator

class Pagination:

    def __init__(self):
        self._page = 1
        self._size = 10
        self._max_size = 100
        self._total_pages = 1
    
    @property
    def page(self):
        return self._page

    @page.setter
    def page(self, value):
        if value is not None and value.isdigit():
            self._page = int(value)
        else:
            self._page = 1  # Fallback to first page if value is invalid

    @property
    def total_pages(self):
        return self._total_pages

    @total_pages.setter
    def total_pages(self, value):
        if value is not None and isinstance(value, int):
            self._total_pages = value

    @property
    def size(self):
        return self._size

    @size.setter
    def size(self, value):
        if value is not None and value.isdigit():
            self._size = min(int(value), self._max_size)
        else:
            self._size = 10  # Default to 10 if invalid value is provided
    
    def paginate_data(self, data):
        # Ensure data is ordered
        data = data.order_by('id')  # Adjust this based on your ordering criteria
        
        paginator = Paginator(data, self.size)
        self.total_pages = paginator.num_pages

        try:
            # Get the current page
            data = paginator.page(self.page)
        except PageNotAnInteger:
            # If page is not an integer, deliver the first page
            data = paginator.page(1)
        except EmptyPage:
            # If page is out of range (e.g., 9999), deliver the last page
            data = paginator.page(self.total_pages)
        
        return data
