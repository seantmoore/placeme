from django.db import models


class Board(models.Model):
    create_date = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=False)
    locked = models.BooleanField(default=False)
    height = models.IntegerField(null=False)
    width = models.IntegerField(null=False)


class Square(models.Model):
    create_date = models.DateTimeField(auto_now_add=True)
    board_id = models.IntegerField(null=False)
    x = models.IntegerField(null=False)
    y = models.IntegerField(null=False)
    r = models.IntegerField(null=False)
    g = models.IntegerField(null=False)
    b = models.IntegerField(null=False)
