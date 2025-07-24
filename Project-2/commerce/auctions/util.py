import re 

def image_url_checker(url): 
        url = url.lower() 
        file_types = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg"]
        for file_type in file_types:
            if re.search(fr"{file_type}", url): 
                query_position = url.find("?") 
                hash_position = url.find("#")
                if query_position == -1: 
                    if hash_position == -1: 
                        return url 
                    else: 
                        return url.split("#")[0]
                if hash_position == -1: 
                    return url.split("?")[0]
                else: 
                    return url[:min(query_position, hash_position)]
        return None
            
        